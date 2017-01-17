namespace ZincDB {
	export namespace DB {
		export class InMemoryAdapter implements StorageAdapter {
			private objectStores: { [name: string]: Map<string, Entry<any>> } = {};
			private opened = false;

			//////////////////////////////////////////////////////////////////////////////////////
			// Initialization operations
			//////////////////////////////////////////////////////////////////////////////////////
			constructor(public dbName: string) {
			}

			async open(): Promise<void> {
				this.opened = true;
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Object store operations
			//////////////////////////////////////////////////////////////////////////////////////
			async createObjectStoresIfNeeded(objectStoreNames: string[]): Promise<void> {
				for (const objectStoreName of objectStoreNames)
					if (this.objectStores[objectStoreName] === undefined)
						this.objectStores[objectStoreName] = new StringMap<Entry<any>>()
			}

			async deleteObjectStores(objectStoreNames: string[]): Promise<void> {
				for (const objectStoreName of objectStoreNames)
					this.objectStores[objectStoreName] = <any>undefined;
			}

			async clearObjectStores(objectStoreNames: string[]): Promise<void> {
				for (const objectStoreName of objectStoreNames)
					if (this.objectStores[objectStoreName] === undefined)
						throw new Error(`Object store '${objectStoreName}' does not exist.`)

				for (const objectStoreName of objectStoreNames)
					this.objectStores[objectStoreName].clear();
			}

			async getObjectStoreNames(): Promise<string[]> {
				const results: string[] = [];
				for (const name in this.objectStores)
					if (this.objectStores[name] != null)
						results.push(name);

				results.sort((a, b) => Comparers.simpleStringComparer(a, b));
				return results;
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Write operations
			//////////////////////////////////////////////////////////////////////////////////////
			async set(transactionObject: { [objectStoreName: string]: { [key: string]: Entry<any> } }): Promise<void> {
				for (const objectStoreName in transactionObject)
					if (this.objectStores[objectStoreName] === undefined)
						throw new Error(`Object store '${objectStoreName}' does not exist.`)

				for (const objectStoreName in transactionObject) {
					const objectStore = this.objectStores[objectStoreName];
					const operationsForObjectstore = transactionObject[objectStoreName];

					for (const key in operationsForObjectstore) {
						const value = operationsForObjectstore[key];

						if (value == null)
							objectStore.delete(key);
						else
							objectStore.set(key, LocalDBOperations.cloneEntry(value))
					}
				}
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Read operations
			//////////////////////////////////////////////////////////////////////////////////////
			async get<V>(key: string, objectStoreName: string, indexName?: string): Promise<Entry<V>>
			async get<V>(keys: string[], objectStoreName: string, indexName?: string): Promise<Entry<V>[]>
			async get<V>(keyOrKeys: string | string[], objectStoreName: string, indexName?: string): Promise<Entry<V> | Entry<V>[]> {
				const objectStore = this.objectStores[objectStoreName];

				if (objectStore === undefined)
					throw new Error(`Object store '${objectStoreName}' does not exist.`)

				if (typeof keyOrKeys === "string") {
					return LocalDBOperations.cloneEntry(objectStore.get(keyOrKeys));
				}
				else {
					const results: Entry<V>[] = [];

					for (const key of keyOrKeys)
						results.push(LocalDBOperations.cloneEntry(objectStore.get(key)));

					return results;
				}
			}

			async has(key: string, objectStoreName: string, indexName?: string): Promise<boolean>;
			async has(keys: string[], objectStoreName: string, indexName?: string): Promise<boolean[]>;
			async has(keyOrKeys: string | string[], objectStoreName: string, indexName?: string): Promise<boolean | boolean[]> {
				const objectStore = this.objectStores[objectStoreName];

				if (objectStore === undefined)
					throw new Error(`Object store '${objectStoreName}' does not exist.`)

				if (typeof keyOrKeys === "string") {
					return objectStore.has(keyOrKeys);
				} else if (Array.isArray(keyOrKeys)) {
					if (keyOrKeys.length === 0)
						return [];

					return keyOrKeys.map((key) => objectStore.has(key));
				} else {
					throw new TypeError("First argument must be 'string' or 'string[]'");
				}
			}

			async getAll<V>(objectStoreName: string): Promise<Entry<V>[]> {
				const objectStore = this.objectStores[objectStoreName];

				if (objectStore === undefined)
					throw new Error(`Object store '${objectStoreName}' does not exist.`)

				const results: Entry<V>[] = [];

				objectStore.forEach((value, key) => {
					results.push(LocalDBOperations.cloneEntry(value));
				});

				results.sort((a, b) => Comparers.simpleStringComparer(a.key, b.key));
				return results;
			}

			async getAllKeys(objectStoreName: string, indexName?: string): Promise<string[]> {
				const objectStore = this.objectStores[objectStoreName];

				if (objectStore === undefined)
					throw new Error(`Object store '${objectStoreName}' does not exist.`)

				const results: string[] = [];

				objectStore.forEach((value, key) => results.push(key));

				results.sort((a, b) => Comparers.simpleStringComparer(a, b));

				return results;
			}

			async count(filter: any, objectStoreName: string): Promise<number> {
				const objectStore = this.objectStores[objectStoreName];

				if (objectStore === undefined)
					throw new Error(`Object store '${objectStoreName}' does not exist.`)

				return objectStore.size;
			}

			async createIterator(objectStoreName: string,
				indexName: string,
				options: {},
				onIteration: (result: Entry<any>) => Promise<void>
			): Promise<void> {
				const objectStore = this.objectStores[objectStoreName];
				if (objectStore === undefined)
					throw new Error(`Object store '${objectStoreName}' does not exist.`)

				const allKeys: string[] = []
				objectStore.forEach((value, key) => allKeys.push(key));
				allKeys.sort(Comparers.simpleStringComparer);

				for (let i = 0; i < allKeys.length; i++) {
					const value = LocalDBOperations.cloneEntry(objectStore.get(allKeys[i]));
					await onIteration(value);
				}
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Finalization operations
			//////////////////////////////////////////////////////////////////////////////////////
			async close(): Promise<void> {
				this.opened = false;
			}

			async destroy(): Promise<void> {
				this.objectStores = {};
				this.opened = false;
			}

			get isOpen() {
				return this.opened;
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Static methods
			//////////////////////////////////////////////////////////////////////////////////////
			static get isAvailable(): boolean {
				return true;
			}
		}
	}
}
