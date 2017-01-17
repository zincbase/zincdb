namespace ZincDB {
	export namespace DB {
		export class IndexedDBAdapter implements StorageAdapter {
			db: IDBDatabase;

			//////////////////////////////////////////////////////////////////////////////////////
			// Initialization operations
			//////////////////////////////////////////////////////////////////////////////////////
			constructor(public dbName: string) {
			}

			async open(newVersionNumber?: number, upgradeHandler?: (event: IDBVersionChangeEvent) => void): Promise<void> {
				if (this.db && newVersionNumber === undefined)
					return;

				await this.close();

				let request: IDBOpenDBRequest;

				if (newVersionNumber === undefined)
					request = indexedDB.open(this.dbName);
				else
					request = indexedDB.open(this.dbName, newVersionNumber);

				const operationPromise = new OpenPromise<IDBDatabase>();

				let upgradeEventTriggered = false;
				let abortRequested = false;

				request.onsuccess = (event) => operationPromise.resolve(request.result);
				request.onerror = (event) => operationPromise.reject(event.target["error"]);

				request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
					upgradeEventTriggered = true;

					const transaction: IDBTransaction = event.target["transaction"];

					if (abortRequested) {
						if (transaction)
							transaction.abort();
						else
							throw new Error("Database open abort requested but no transaction object is available in order to abort it");
					}

					if (transaction) {
						transaction.onabort = (event) => operationPromise.reject(event.target["error"]);
						transaction.onerror = (event) => operationPromise.reject(event.target["error"]);
					}

					if (upgradeHandler) {
						try {
							upgradeHandler(event);
						}
						catch (e) {
							operationPromise.reject(e);
						}
					}
				}

				request.onblocked = () => {
					log("IndexedDB open: Database upgrade operation blocked, waiting..");

					setTimeout(() => {
						if (upgradeEventTriggered)
							return;

						abortRequested = true;

						const failureMessage = "IndexedDB open: Database upgrade operation failed: timeout exceeded";

						log(failureMessage)
						operationPromise.reject(new Error(failureMessage));
					}, 4000);
				}

				this.db = await operationPromise;
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Object store operations
			//////////////////////////////////////////////////////////////////////////////////////
			async createObjectStoresIfNeeded(objectStoreNames: string[]): Promise<void> {
				if (!this.isOpen)
					throw new Error(`createObjectStoresIfNeeded: db is not open`);

				let missingObjectStoreFound = false;
				objectStoreNames.forEach((objectStoreName) => {
					if (!this.db.objectStoreNames.contains(objectStoreName))
						missingObjectStoreFound = true;
				});

				if (!missingObjectStoreFound)
					return Promise.resolve();

				const upgradeHandler = (event: IDBVersionChangeEvent) => {
					const db: IDBDatabase = event.target["result"];

					objectStoreNames.forEach((objectStoreName) => {
						if (!db.objectStoreNames.contains(objectStoreName)) {
							//log(`Creating new object store '${objectStoreName}' in '${this.dbName}'`);
							const objectStore = db.createObjectStore(objectStoreName, { keyPath: "key" });

							if ((<any>objectStore)["openKeyCursor"] === undefined)
								objectStore.createIndex("_primaryKey", "key");
						}
					});
				}

				return await this.open(this.db.version + 1, upgradeHandler);
			}

			async deleteObjectStores(objectStoreNames: string[]): Promise<void> {
				if (!this.isOpen)
					throw new Error(`deleteObjectStore: db is not open`);

				let existingObjectStoreFound = false;

				for (const objectStoreName of objectStoreNames)
					if (this.db.objectStoreNames.contains(objectStoreName))
						existingObjectStoreFound = true;

				if (!existingObjectStoreFound)
					return Promise.resolve();

				const upgradeHandler = (event: IDBVersionChangeEvent) => {
					for (const objectStoreName of objectStoreNames) {
						const db: IDBDatabase = event.target['result'];

						if (db.objectStoreNames.contains(objectStoreName)) {
							// console.log(`Deleting object store '${objectStoreName}'`);
							db.deleteObjectStore(objectStoreName);
						}
					}
				}

				return await this.open(this.db.version + 1, upgradeHandler);
			}

			async getObjectStoreNames(): Promise<string[]> {
				if (!this.isOpen)
					throw new Error(`objectStoreNames: db is not open`);

				const nameList = this.db.objectStoreNames;
				const results: string[] = [];

				for (let i = 0; i < nameList.length; i++) {
					const item = nameList.item(i);

					if (item != null)
						results.push(item);
				}

				results.sort((a, b) => Comparers.simpleStringComparer(a, b));

				return results;
			}

			async clearObjectStores(objectStoreNames: string[]): Promise<void> {
				if (!this.isOpen)
					throw new Error(`clearObjectStores: db is not open`);

				for (const objectStoreName of objectStoreNames) {
					if (!this.db.objectStoreNames.contains(objectStoreName))
						throw new Error(`Object store '${objectStoreName}' was not found`);
				}

				const transaction = this.db.transaction(objectStoreNames, "readwrite");
				const requests: IDBRequest[] = [];

				for (const objectStoreName of objectStoreNames) {
					if (!this.db.objectStoreNames.contains(objectStoreName))
						continue;

					requests.push(transaction.objectStore(objectStoreName).clear());
				}

				return await this.createUnifiedPromiseForTransaction<void>(transaction, requests);
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Index operations
			//////////////////////////////////////////////////////////////////////////////////////
			async createIndex(indexName: string, objectStoreName: string, keypath: string | string[], params?: IDBIndexParameters): Promise<void> {
				if (!this.isOpen)
					throw new Error(`createIndex: db is not open`);

				if (!this.db.objectStoreNames.contains(objectStoreName))
					throw new Error(`Object store '${objectStoreName}' was not found`);

				const upgradeHandler = (event: IDBVersionChangeEvent) => {
					const db: IDBDatabase = event.target['result'];
					const transaction: IDBTransaction = event.target['transaction'];

					if (db.objectStoreNames.contains(objectStoreName)) {
						const objectStore = transaction.objectStore(objectStoreName);

						if (objectStore.indexNames.contains(indexName)) {
							// log(`Deleting existing index '${indexName}' in '${objectStoreName}'`);
							objectStore.deleteIndex(indexName);
						}

						// log(`Creating a new index '${indexName}' in '${objectStoreName}'`);
						objectStore.createIndex(indexName, keypath, params);
					}
					else
						throw new Error(`createIndex: object store '${objectStoreName}' was not found`);
				}

				return await this.open(this.db.version + 1, upgradeHandler);
			}

			async deleteIndex(indexName: string, objectStoreName: string): Promise<void> {
				if (!this.isOpen)
					throw new Error(`deleteIndex: db is not open`);

				if (!this.db.objectStoreNames.contains(objectStoreName))
					throw new Error(`Object store '${objectStoreName}' was not found`);

				const upgradeHandler = (event: IDBVersionChangeEvent) => {
					const db: IDBDatabase = event.target['result'];
					const transaction: IDBTransaction = event.target['transaction'];

					if (db.objectStoreNames.contains(objectStoreName)) {
						const objectStore = transaction.objectStore(objectStoreName);

						if (!objectStore.indexNames.contains(indexName))
							return;

						// log(`Deleting index '${indexName}' in '${objectStoreName}'`);
						objectStore.deleteIndex(indexName);
					}
					else
						throw new Error(`createIndex: object store '${objectStoreName}' was not found`);
				}

				return await this.open(this.db.version + 1, upgradeHandler);
			}

			async getIndexList(objectStoreName: string): Promise<DOMStringList> {
				if (!this.isOpen)
					return Promise.reject<DOMStringList>(new Error(`deleteIndex: db is not open`));

				if (!this.db.objectStoreNames.contains(objectStoreName))
					return Promise.reject<DOMStringList>(new Error(`Object store '${objectStoreName}' was not found`));

				const operationPromise = new OpenPromise<DOMStringList>();

				const transaction = this.db.transaction([objectStoreName], "readonly")
				const indexNames = transaction.objectStore(objectStoreName).indexNames;

				transaction.oncomplete = () => operationPromise.resolve(indexNames);
				transaction.onerror = (event) => operationPromise.reject(event.target["error"]);
				transaction.onabort = (event) => operationPromise.reject(event.target["error"]);

				return await operationPromise;
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Write operations
			//////////////////////////////////////////////////////////////////////////////////////			
			async set(transactionObject: { [objectStoreName: string]: { [key: string]: Entry<any> | null } }): Promise<void> {
				if (!this.isOpen)
					throw new Error(`set: db is not open`);

				const objectStoreNames = Object.keys(transactionObject);

				for (const objectStoreName of objectStoreNames) {
					if (!this.db.objectStoreNames.contains(objectStoreName))
						throw new Error(`set: object store '${objectStoreName}' does not exist`);
				}

				const transaction = this.db.transaction(objectStoreNames, "readwrite");
				const requests: IDBRequest[] = [];

				for (const objectStoreName of objectStoreNames) {
					const objectStore = transaction.objectStore(objectStoreName);
					const entries = transactionObject[objectStoreName];

					for (const entryKey in entries) {
						const entry = entries[entryKey];

						if (entry != null) {
							if (entryKey !== entry.key)
								throw new Error(`set: key mismatch, object key is '${entryKey}' while entry key is '${entry.key}'`);

							requests.push(objectStore.put(entry))
						}
						else {
							requests.push(objectStore.delete(entryKey))
						}
					}
				}

				return await this.createUnifiedPromiseForTransaction<void>(transaction, requests);
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Read operations
			//////////////////////////////////////////////////////////////////////////////////////				
			async get<V>(key: string, objectStoreName: string, indexName?: string): Promise<Entry<V>>
			async get<V>(keys: string[], objectStoreName: string, indexName?: string): Promise<Entry<V>[]>
			async get<V>(keyOrKeys: string | string[], objectStoreName: string, indexName?: string): Promise<Entry<V> | Entry<V>[]> {
				if (!this.isOpen)
					throw new Error(`get: db is not open`);

				if (!this.db.objectStoreNames.contains(objectStoreName))
					throw new Error(`get: object store '${objectStoreName}' does not exist`);

				const transaction = this.db.transaction(objectStoreName, "readonly");
				const objectStore = transaction.objectStore(objectStoreName);

				if (indexName && !objectStore.indexNames.contains(indexName))
					throw new Error(`get: index '${indexName}' does not exist in object store '${objectStoreName}'`);

				const createGetRequest = (key: string): IDBRequest => {
					if (indexName)
						return objectStore.index(indexName).get(key);
					else
						return objectStore.get(key);
				}

				if (typeof keyOrKeys === "string") {
					const request = createGetRequest(keyOrKeys);
					return await this.createUnifiedPromiseForTransaction<Entry<any>>(transaction, request);
				}
				else {
					const requests: IDBRequest[] = [];

					for (const key of keyOrKeys)
						requests.push(createGetRequest(key));

					return await this.createUnifiedPromiseForTransaction<Entry<V>[]>(transaction, requests);
				}
			}

			async has(key: string, objectStoreName: string, indexName?: string): Promise<boolean>;
			async has(keys: string[], objectStoreName: string, indexName?: string): Promise<boolean[]>;
			async has(keyOrKeys: string | string[], objectStoreName: string, indexName?: string): Promise<boolean | boolean[]> {
				if (!this.isOpen)
					throw new Error(`get: db is not open`);

				if (typeof keyOrKeys === "string") {
					const result = await this.get<any>(keyOrKeys, objectStoreName, indexName);
					return result !== undefined;
				} else if (Array.isArray(keyOrKeys)) {
					if (keyOrKeys.length === 0)
						return [];

					const results = await this.get<any>(keyOrKeys, objectStoreName, indexName);
					return results.map((entry) => entry !== undefined);
				} else {
					throw new TypeError("First argument must be a string or array of strings.");
				}
			}

			/// Get all records
			async getAll<V>(objectStoreName: string): Promise<Entry<V>[]> {
				return await this.getRange({}, objectStoreName);
			}

			/// Get all records satisfying a range
			async getRange(rangeOptions: IndexedDBAdapterRangeOptions, objectStoreName: string, indexName?: string): Promise<Entry<any>[]> {
				const getUsingGetAll = async (range: IDBKeyRange, objectStore: IDBObjectStore, transaction: IDBTransaction): Promise<Entry<any>[]> => {
					let request: IDBRequest;

					if (indexName != null)
						request = objectStore.index(indexName)["getAll"](range);
					else
						request = objectStore["getAll"](range)

					return await this.createUnifiedPromiseForTransaction<Entry<any>[]>(transaction, request);
				}

				const getUsingCursor = async (range: IDBKeyRange, objectStore: IDBObjectStore, transaction: IDBTransaction): Promise<Entry<any>[]> => {
					const transactionPromise = this.createPromiseForTransaction(transaction);

					const requestPromise = new OpenPromise<Entry<any>[]>();
					let cursorRequest: IDBRequest;

					if (indexName != null)
						cursorRequest = objectStore.index(indexName).openCursor(range);
					else
						cursorRequest = objectStore.openCursor(range);

					const results: Entry<any>[] = [];

					cursorRequest.onsuccess = (event: any) => {
						const cursor: IDBCursorWithValue = event.target.result;

						if (cursor) {
							results.push(cursor.value);

							cursor.continue();
						}
						else {
							requestPromise.resolve(results);
						}
					}

					cursorRequest.onerror = (event) => {
						requestPromise.reject(event.target["error"]);
					}

					const [requestResult] = await Promise.all([requestPromise, transactionPromise]);
					return requestResult;
				}


				if (!this.isOpen)
					throw new Error(`getRange: database is not open`);

				if (!this.db.objectStoreNames.contains(objectStoreName))
					throw new Error(`getRange: object store '${objectStoreName}' does not exist`);

				const transaction = this.db.transaction(objectStoreName, "readonly");
				const objectStore = transaction.objectStore(objectStoreName);

				const range = this.rangeOptionsToIDBKeyRange(rangeOptions);

				if (typeof objectStore["getAll"] === "function")
					return await getUsingGetAll(range, objectStore, transaction);
				else
					return await getUsingCursor(range, objectStore, transaction);
			}

			async getAllKeys(objectStoreName: string, indexName?: string): Promise<string[]> {
				const primaryAndSecondaryKeys = await this.getKeyRange({}, objectStoreName);

				const result: string[] = [];

				for (const element of primaryAndSecondaryKeys)
					result.push(element.primaryKey);

				return result;
			}

			/// Get all keys for records satisfying a range
			async getKeyRange(rangeOptions: IndexedDBAdapterRangeOptions, objectStoreName: string, indexName?: string): Promise<{ primaryKey: string; key: any }[]> {
				const getUsingGetAllKeys = async (range: IDBKeyRange, objectStore: IDBObjectStore, transaction: IDBTransaction): Promise<{ primaryKey: any; key: any }[]> => {
					let getAllKeysRequest: IDBRequest;

					if (indexName != null)
						getAllKeysRequest = objectStore.index(indexName)["getAllKeys"](range);
					else
						getAllKeysRequest = objectStore["getAllKeys"](range)

					const keys = await this.createUnifiedPromiseForTransaction<any[]>(transaction, getAllKeysRequest);

					// Note: using 'getAllKeys' on an index does not return secondary keys
					const results: { primaryKey: string; key: any }[] = [];

					for (const key of keys)
						results.push({ primaryKey: key, key: key });

					return results;
				}

				const getUsingKeyCursor = async (range: IDBKeyRange, objectStore: IDBObjectStore, transaction: IDBTransaction): Promise<{ primaryKey: string; key: any }[]> => {
					const transactionPromise = this.createPromiseForTransaction(transaction);
					const requestPromise = new OpenPromise<{ primaryKey: string; key: any }[]>();
					let cursorRequest: IDBRequest;

					if (indexName != null)
						cursorRequest = objectStore.index(indexName).openKeyCursor(range);
					else {
						if (objectStore["openKeyCursor"] !== undefined)
							cursorRequest = objectStore["openKeyCursor"](range);
						else if (objectStore.indexNames.contains("_primaryKey"))
							cursorRequest = objectStore.index("_primaryKey").openKeyCursor(range);
						else
							throw new Error(`getKeyRange: openKeyCursor is not supported and no keypath index is available`);
					}

					const results: { primaryKey: string; key: any }[] = [];

					cursorRequest.onsuccess = (event: any) => {
						const cursor: IDBCursorWithValue = event.target.result;

						if (cursor) {
							results.push({ primaryKey: cursor.primaryKey, key: cursor.key });

							cursor.continue();
						}
						else {
							requestPromise.resolve(results);
						}
					}

					cursorRequest.onerror = (event) => {
						requestPromise.reject(event.target["error"]);
					}

					const [requestResults] = await Promise.all([requestPromise, transactionPromise]);
					return requestResults;
				}


				if (!this.isOpen)
					throw new Error(`getKeyRange: database is not open`);

				if (!this.db.objectStoreNames.contains(objectStoreName))
					throw new Error(`getKeyRange: object store '${objectStoreName}' does not exist`);

				const range = this.rangeOptionsToIDBKeyRange(rangeOptions);
				const transaction = this.db.transaction(objectStoreName, "readonly");
				const objectStore = transaction.objectStore(objectStoreName);

				if (typeof objectStore["getAllKeys"] === "function" && indexName == null)
					return await getUsingGetAllKeys(range, objectStore, transaction);
				else
					return await getUsingKeyCursor(range, objectStore, transaction);
			}

			//// Count records in range
			async count(rangeOptions: IndexedDBAdapterRangeOptions, objectStoreName: string, indexName?: string): Promise<number> {
				if (!this.isOpen)
					throw new Error(`BrowserStore.countRecordsInKeyRange: database is not open`);

				if (!this.db.objectStoreNames.contains(objectStoreName))
					throw new Error(`BrowserStore.countRecordsInKeyRange: object store '${objectStoreName}' does not exist`);

				const transaction = this.db.transaction(objectStoreName, "readonly");
				const objectStore = transaction.objectStore(objectStoreName);

				const range = this.rangeOptionsToIDBKeyRange(rangeOptions);

				let request: IDBRequest;

				if (indexName) {
					if (range)
						request = objectStore.index(indexName).count(range);
					else
						request = objectStore.index(indexName).count();
				}
				else {
					if (range)
						request = objectStore.count(range);
					else
						request = objectStore.count();
				}

				return await this.createUnifiedPromiseForTransaction<number>(transaction, request);
			}

			/// Create an iterator
			async createIterator(objectStoreName: string,
				indexName: string | undefined,
				options: { rangeOptions?: IndexedDBAdapterRangeOptions, transactionScope?: string[], transactionMode?: "readonly" | "readwrite" },
				onIteration: (result: Entry<any>, transactionContext: IDBTransaction) => Promise<void>
			): Promise<void> {
				if (!this.isOpen)
					throw new Error(`createIterator: database is not open`);

				if (!this.db.objectStoreNames.contains(objectStoreName))
					throw new Error(`createIterator: object store '${objectStoreName}' does not exist`);

				options = ObjectTools.override({
					rangeOptions: {},
					transactionMode: "readonly",
					transactionScope: [objectStoreName]
				}, options);

				if (typeof onIteration !== "function")
					throw new Error(`createIterator: invalid callback function supplied`);

				const transaction = this.db.transaction(<string[]>options.transactionScope, options.transactionMode)
				const transactionPromise = this.createPromiseForTransaction(transaction);

				const objectStore = transaction.objectStore(objectStoreName);
				const range = this.rangeOptionsToIDBKeyRange(<any>options.rangeOptions);

				const cursorPromise = new OpenPromise<void>();
				let cursorRequest: IDBRequest;

				if (indexName != null)
					cursorRequest = objectStore.index(indexName).openCursor(range);
				else
					cursorRequest = objectStore.openCursor(range);

				cursorRequest.onsuccess = async (event: any) => {
					const cursor: IDBCursorWithValue = event.target.result;

					if (cursor) {
						try {
							// Note the hander promise is not awaited here due to a limitation
							// of IndexedDB
							onIteration(cursor.value, transaction);
							cursor.continue();
						}
						catch (e) {
							cursorPromise.reject(e);
							transaction.abort();
							return;
						}
					}
					else {
						cursorPromise.resolve();
					}
				}

				cursorRequest.onerror = (event) => cursorPromise.reject(event.target["error"]);

				await <any>Promise.all([cursorPromise, transactionPromise]);
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Finalization operations
			//////////////////////////////////////////////////////////////////////////////////////
			async close(): Promise<void> {

				if (this.db) {
					this.db.close();
					this.db = <any>undefined;
				}
			}

			async destroy(): Promise<void> {
				await this.close();
				await this.createPromiseForRequest<void>(indexedDB.deleteDatabase(this.dbName));
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Getters
			//////////////////////////////////////////////////////////////////////////////////////			
			get isOpen() {
				return this.db !== undefined;
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Private methods
			//////////////////////////////////////////////////////////////////////////////////////
			private rangeOptionsToIDBKeyRange(rangeOptions: IndexedDBAdapterRangeOptions): IDBKeyRange {
				if (!rangeOptions)
					rangeOptions = {};

				if (rangeOptions.lowerBoundOpen === undefined)
					rangeOptions.lowerBoundOpen = false;

				if (rangeOptions.upperBoundOpen === undefined)
					rangeOptions.upperBoundOpen = false;

				let range: IDBKeyRange;

				if (rangeOptions.range)
					range = rangeOptions.range;
				else if (rangeOptions.lowerBound && rangeOptions.upperBound)
					range = IDBKeyRange.bound(rangeOptions.lowerBound, rangeOptions.upperBound, rangeOptions.lowerBoundOpen, rangeOptions.upperBoundOpen);
				else if (rangeOptions.lowerBound)
					range = IDBKeyRange.lowerBound(rangeOptions.lowerBound, rangeOptions.lowerBoundOpen);
				else if (rangeOptions.upperBound)
					range = IDBKeyRange.upperBound(rangeOptions.upperBound, rangeOptions.upperBoundOpen);
				else if (rangeOptions.keyPrefix)
					range = IDBKeyRange.bound(rangeOptions.keyPrefix, rangeOptions.keyPrefix + 'uffff', false, false);
				else if (rangeOptions.equals)
					range = IDBKeyRange.only(rangeOptions.equals);
				else
					range = <any>null;

				return range;
			}

			private createPromiseForTransaction(transaction: IDBTransaction): Promise<void> {
				return new Promise<void>((resolve, reject) => {
					transaction.oncomplete = (event) => resolve();
					transaction.onerror = (event) => reject(event.target["error"]);
					transaction.onabort = (event) => reject(event.target["error"]);
				});
			}

			private createPromiseForRequest<R>(request: IDBRequest): Promise<R> {
				return new Promise<R>((resolve, reject) => {
					request.onsuccess = (event) => resolve(request.result);
					request.onerror = (event) => reject(event.target["error"]);
				});
			}

			private createUnifiedPromiseForTransaction<R>(transaction: IDBTransaction, request: IDBRequest): Promise<R>
			private createUnifiedPromiseForTransaction<R>(transaction: IDBTransaction, requests: IDBRequest[]): Promise<R>
			private createUnifiedPromiseForTransaction<R>(transaction: IDBTransaction, requestOrRequests: IDBRequest | IDBRequest[]): Promise<R> {
				const transactionPromise = this.createPromiseForTransaction(transaction);
				let requestPromise: Promise<R>;

				if (Array.isArray(requestOrRequests)) {
					const requestPromises: Promise<R>[] = [];

					for (const request of requestOrRequests)
						requestPromises.push(this.createPromiseForRequest(request));

					requestPromise = <any>Promise.all(requestPromises);
				}
				else {
					requestPromise = this.createPromiseForRequest<R>(requestOrRequests);
				}

				return Promise.all([requestPromise, transactionPromise])
					.then(([requestPromiseResults]) => requestPromiseResults);
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Static methods
			//////////////////////////////////////////////////////////////////////////////////////
			static compare(a: any, b: any): number {
				return indexedDB.cmp(a, b);
			}

			static readKeypath(obj: any, keypath: string): any {
				if (!keypath)
					return obj;

				const tokens = keypath.split(".");

				for (let i = 0; i < tokens.length; i++) {
					const token = tokens[i];

					obj = obj[token];

					if (i === tokens.length - 1)
						return obj;

					if (obj === undefined)
						return undefined;
					else if (obj === null || typeof obj !== "object" || Object.getPrototypeOf(obj) !== Object.prototype)
						throw new Error(`Non-nestable property type found for token '${token}' at nesting level ${i + 1}`);
				}
			}

			static writeKeypath(obj: any, keypath: string, value: any): any {
				if (keypath == null)
					throw new TypeError(`Supplied keypath was null or undefined`);

				if (keypath === "")
					throw new Error(`Cannot write to an empty keypath, assign the target object itself instead.`);

				const tokens = keypath.split(".");

				let currentObj = obj;

				for (let i = 0; i < tokens.length; i++) {
					const token = tokens[i];

					if (i === tokens.length - 1) {
						currentObj[token] = value;
						return obj;
					}

					if (currentObj[token] === undefined)
						currentObj[token] = {}; // Could optionally error here instead
					else if (currentObj[token] === null || typeof currentObj[token] !== "object" || Object.getPrototypeOf(currentObj[token]) !== Object.prototype)
						throw new Error(`Non-nestable property type found for token '${token}' at nesting level ${i + 1}`);

					currentObj = currentObj[token];
				}
			}

			static get isAvailable(): boolean {
				if (typeof indexedDB === "undefined")
					return false;

				if (navigator && navigator.userAgent) {
					const userAgent = navigator.userAgent;

					if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent))
						return false;

					if (/Android 4\.3/.test(userAgent))
						return false;
				}

				return true;
			}
		}

		export interface IndexedDBAdapterRangeOptions {
			range?: IDBKeyRange;
			lowerBound?: any;
			upperBound?: any;
			lowerBoundOpen?: boolean;
			upperBoundOpen?: boolean;
			keyPrefix?: string;
			equals?: any
		}
	}
}