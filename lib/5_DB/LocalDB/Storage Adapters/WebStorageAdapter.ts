namespace ZincDB {
	export namespace DB {
		type MetadataAndValue = { metadata: EntryMetadata, value: any };

		type DatabaseMetadataEntry = { objectStoreNames?: string[] };

		// Rollback record structure:
		// [Object store name, key, previous raw value (or null)]
		type RollbackRecord = [string, string, string | null][];

		export class WebStorageAdapter implements StorageAdapter {
			private opened = false;
			private readonly webStorage: Storage;
			private readonly databasePrefix: string;

			//////////////////////////////////////////////////////////////////////////////////////
			// Initialization operations
			//////////////////////////////////////////////////////////////////////////////////////
			constructor(public readonly dbName: string, readonly webStorageType: "LocalStorage" | "SessionStorage") {
				if (webStorageType === "LocalStorage")
					this.webStorage = localStorage;
				else if (webStorageType === "SessionStorage")
					this.webStorage = sessionStorage;
				else
					throw new Error(`Invalid web storage type ${webStorageType}`);

				this.databasePrefix = Keypath.stringify([dbName]);
			}

			async open(): Promise<void> {
				try {
					this.rollbackIfNeeded();
				} catch (e) {
					throw new Error(`WebStorageAdapter Fatal error: couldn't roll-back a previous incomplete transaction. Reason: ${createErrorMessage(e)}`);
				}

				this.opened = true;
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Object store operations
			//////////////////////////////////////////////////////////////////////////////////////
			async createObjectStoresIfNeeded(objectStoresToCreate: string[]): Promise<void> {
				if (!this.isOpen)
					throw new Error("Database is not open");

				const currentObjectStores = await this.getObjectStoreNames();
				const newObjectStores = objectStoresToCreate.filter((name) => currentObjectStores.indexOf(name) === -1);
				await this.putObjectStoreNames([...currentObjectStores, ...newObjectStores]);
			}

			async deleteObjectStores(objectStoresToDelete: string[]): Promise<void> {
				if (!this.isOpen)
					throw new Error("Database is not open");

				await this.clearObjectStores(objectStoresToDelete);
				const currentObjectStoreNames = await this.getObjectStoreNames();

				const newObjectStoreNames = currentObjectStoreNames.filter((name) => objectStoresToDelete.indexOf(name) === -1);
				await this.putObjectStoreNames(newObjectStoreNames);
			}

			async clearObjectStores(objectStoreNames: string[]): Promise<void> {
				if (!this.isOpen)
					throw new Error("Database is not open");

				const objectStorePrefixes = objectStoreNames.map((objectStoreName) => this.getObjectStorePrefix(objectStoreName));

				this.getAllWebStorageKeys()
					.filter((key) => objectStorePrefixes.some((objectStorePrefix) => Tools.stringStartsWith(key, objectStorePrefix)))
					.forEach((key) => this.webStorage.removeItem(key));
			}

			async getObjectStoreNames(): Promise<string[]> {
				if (!this.isOpen)
					throw new Error("Database is not open");

				return this.getDatabaseMetadata().objectStoreNames || [];
			}

			private putObjectStoreNames(newObjectStoreNames: string[]): void {
				if (!this.isOpen)
					throw new Error("Database is not open");

				this.putDatabaseMetadata({ ...this.getDatabaseMetadata(), objectStoreNames: newObjectStoreNames });
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Write operations
			//////////////////////////////////////////////////////////////////////////////////////
			async set(transactionObject: { [objectStoreName: string]: { [key: string]: Entry<any> | null } }): Promise<void> {
				if (!this.isOpen)
					throw new Error("Database is not open");				
				
				const objectStoreNames = await this.getObjectStoreNames();

				for (const objectStoreName in transactionObject)
					if (objectStoreNames.indexOf(objectStoreName) === -1)
						throw new Error(`Object store '${objectStoreName}' does not exist.`)

				// Create a roll-back record for this transaction
				// containing the existing raw values for the keys that would be modified.
				// At the same time, store the corresponding new values in a separate array.
				const newValues: (Entry<any> | null)[] = [];
				const transactionRecord: RollbackRecord = [];

				for (const objectStoreName in transactionObject) {
					const operationsForObjectStore = transactionObject[objectStoreName];

					for (const key in operationsForObjectStore) {
						transactionRecord.push([objectStoreName, key, this.getRawValue(key, objectStoreName)]);
						newValues.push(operationsForObjectStore[key]);
					}
				}

				// Store the roll-back record
				this.putRollbackRecord(transactionRecord);

				// Update the database with the new values, shortcut to use the roll-back record
				// And the previously stored value list instead of re-scanning the transaction object
				try {
					transactionRecord.forEach(([objectStoreName, key], index) => {
						const newValue = newValues[index];

						if (newValue == null)
							this.deleteKey(key, objectStoreName);
						else
							this.putRawValue(key, this.encodeEntryMetadataAndValue(newValue), objectStoreName);
					});
				}
				catch (e) {
					// If an error occured while writing the transaction, roll-back all changes,
					// If the roll-back itself fails, the roll-back record would remain in storage
					// and would be applied the next time the database is opened.
					this.rollbackIfNeeded();

					// Rethrow the error
					throw e;
				}

				// If the execution arrived here, it means that all data has been successfuly written to
				// WebStorage.
				//
				// For the special case of LocalStorage (SessionStorage is most likely memory-only):
				//
				// If the underlying engine for LocalStorage treats function boundaries as transactions, 
				// it would mean that the data would be stored atomically on disk, otherwise, it is not
				// in practice 100% safe to clear the roll-back record, but there isn't much that can be done as
				// saving arbitrary length transaction logs would risk reaching the storage quota
				// of the browser.
				this.clearRollbackRecord();
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Read operations
			//////////////////////////////////////////////////////////////////////////////////////
			async get<V>(key: string, objectStoreName: string): Promise<Entry<V>>
			async get<V>(keys: string[], objectStoreName: string): Promise<Entry<V>[]>
			async get<V>(keyOrKeys: string | string[], objectStoreName: string): Promise<Entry<V> | Entry<V>[]> {
				if (!this.isOpen)
					throw new Error("Database is not open");

				const objectStoreNames = await this.getObjectStoreNames();
				if (objectStoreNames.indexOf(objectStoreName) === -1)
					throw new Error(`Object store '${objectStoreName}' does not exist.`);

				if (typeof keyOrKeys === "string") {
					return this.getEntry(keyOrKeys, objectStoreName);
				}
				else if (Array.isArray(keyOrKeys)) {
					return keyOrKeys.map((key) => this.getEntry(key, objectStoreName));
				}
				else {
					throw new TypeError("The first argument must be a string or array of strings");
				}
			}

			async has(key: string, objectStoreName: string, indexName?: string): Promise<boolean>;
			async has(keys: string[], objectStoreName: string, indexName?: string): Promise<boolean[]>;
			async has(keyOrKeys: string | string[], objectStoreName: string, indexName?: string): Promise<boolean | boolean[]> {
				if (!this.isOpen)
					throw new Error("Database is not open");

				const objectStoreNames = await this.getObjectStoreNames();

				if (objectStoreNames.indexOf(objectStoreName) === -1)
					throw new Error(`Object store '${objectStoreName}' does not exist.`);

				if (typeof keyOrKeys === "string") {
					return this.webStorage.getItem(this.encodeToRawKey(keyOrKeys, objectStoreName)) != null;
				}
				else if (Array.isArray(keyOrKeys)) {
					return keyOrKeys.map((key) => this.webStorage.getItem(this.encodeToRawKey(key, objectStoreName)) != null);
				}
				else {
					throw new TypeError("The first argument must be a string or array of strings");
				}
			}

			async getAll<V>(objectStoreName: string): Promise<Entry<V>[]> {
				if (!this.isOpen)
					throw new Error("Database is not open");

				const allKeys = await this.getAllKeys(objectStoreName);
				return allKeys.map((key) => this.getEntry(key, objectStoreName));
			}

			async getAllKeys(objectStoreName: string): Promise<string[]> {
				if (!this.isOpen)
					throw new Error("Database is not open");

				const objectStorePrefix = this.getObjectStorePrefix(objectStoreName);
				const results: string[] = [];

				this.getAllWebStorageKeys().forEach((key) => {
					if (Tools.stringStartsWith(key, objectStorePrefix)) {
						results.push(key.substring(objectStorePrefix.length));
					}
				});

				return results.sort(Comparers.simpleStringComparer);
			}

			async count(filter: any, objectStoreName: string): Promise<number> {
				if (!this.isOpen)
					throw new Error("Database is not open");

				return (await this.getAllKeys(objectStoreName)).length;
			}

			async createIterator(objectStoreName: string,
				indexName: string | undefined,
				options: {},
				onIteration: (result: Entry<any>) => Promise<void>
			): Promise<void> {
				if (!this.isOpen)
					throw new Error("Database is not open");

				const allKeys = await this.getAllKeys(objectStoreName);

				for (const key of allKeys) {
					await onIteration(this.getEntry(key, objectStoreName));
				}
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Finalization operations
			//////////////////////////////////////////////////////////////////////////////////////
			async close(): Promise<void> {
				this.opened = false;
			}

			async destroy(): Promise<void> {
				if (!this.isOpen)
					throw new Error("Database is not open");
									
				await this.deleteObjectStores(await this.getObjectStoreNames());
				this.deleteKey("@metadata", undefined);
				await this.close();
			}

			get isOpen() {
				return this.opened;
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Low-level read operations (private)
			//////////////////////////////////////////////////////////////////////////////////////
			private getEntry(key: string, objectStoreName: string): Entry<any> {
				const rawValue = this.getRawValue(key, objectStoreName);
				if (rawValue == null)
					return <any>undefined;

				return { key, ...this.decodeValueAndMetadata(rawValue) };
			}

			private getRawValue(key: string, objectStoreName: string | undefined): string | null {
				return this.webStorage.getItem(this.encodeToRawKey(key, objectStoreName));
			}

			private getAllWebStorageKeys(): string[] {
				const webStorageLength = this.webStorage.length;
				const allKeys: string[] = [];

				for (let i = 0; i < webStorageLength; i++) {
					allKeys.push(<string>this.webStorage.key(i));
				}

				return allKeys;
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Low-level write operations (private)
			//////////////////////////////////////////////////////////////////////////////////////				
			private putRawValue(key: string, rawValue: string, objectStoreName: string | undefined): void {
				this.webStorage.setItem(this.encodeToRawKey(key, objectStoreName), rawValue);
			}

			private deleteKey(key: string, objectStoreName: string | undefined): void {
				this.webStorage.removeItem(this.encodeToRawKey(key, objectStoreName));
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Metadata operations (private)
			//////////////////////////////////////////////////////////////////////////////////////
			private getDatabaseMetadata(): DatabaseMetadataEntry {
				if (!this.isOpen)
					throw new Error("Database is not open");

				const encodedMetadata = this.getRawValue("@metadata", undefined);

				if (encodedMetadata) {
					return Encoding.OmniJson.decode(encodedMetadata);
				} else {
					return {};
				}
			}

			private putDatabaseMetadata(newMetadata: DatabaseMetadataEntry): void {
				if (!this.isOpen)
					throw new Error("Database is not open");

				this.putRawValue("@metadata", Encoding.OmniJson.encode(newMetadata), undefined);
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Roll-back operations (private)
			//////////////////////////////////////////////////////////////////////////////////////
			private rollbackIfNeeded() {
				const rollbackRecord = this.getRollbackRecord();

				if (!rollbackRecord)
					return;

				rollbackRecord.forEach(([objectStoreName, key, rawValue]) => {
					if (rawValue === null)
						this.deleteKey(key, objectStoreName);
					else
						this.putRawValue(key, rawValue, objectStoreName);
				});

				log(`Rolled back a previous incomplete transaction in database '${this.dbName}'. Rollback record: ${Encoding.JsonX.encode(rollbackRecord)}`);
				this.clearRollbackRecord();
			}

			private getRollbackRecord(): RollbackRecord | undefined {
				const rawRollBackEntry = this.getRawValue("@rollback", undefined);

				if (rawRollBackEntry == null)
					return undefined;
				else
					return Encoding.JsonX.decode(rawRollBackEntry);
			}

			private putRollbackRecord(rollbackEntry: RollbackRecord): void {
				this.putRawValue("@rollback", Encoding.JsonX.encode(rollbackEntry), undefined);
			}

			private clearRollbackRecord() {
				this.deleteKey("@rollback", undefined);
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Encoding operations (private)
			//////////////////////////////////////////////////////////////////////////////////////
			private getObjectStorePrefix(objectStoreName: string | undefined) {
				if (objectStoreName == null)
					return this.databasePrefix;
				else
					return this.databasePrefix + Keypath.stringify([objectStoreName]);
			}

			private encodeToRawKey(key: string, objectStoreName: string | undefined) {
				return this.getObjectStorePrefix(objectStoreName) + key;
			}

			private encodeEntryMetadataAndValue(entry: Entry<any>): string {
				return Encoding.OmniJson.encode(entry.metadata) + "\t" + Encoding.OmniJson.encode(entry.value);
			}

			private decodeValueAndMetadata(encodedMetadataAndValue: string): MetadataAndValue {
				const firstTabIndex = encodedMetadataAndValue.indexOf("\t");
				const encodedMetadata = encodedMetadataAndValue.substring(0, firstTabIndex);
				const encodedValue = encodedMetadataAndValue.substring(firstTabIndex + 1);

				return { value: Encoding.OmniJson.decode(encodedValue), metadata: Encoding.OmniJson.decode(encodedMetadata) };
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Static methods
			//////////////////////////////////////////////////////////////////////////////////////
			static get isAvailable(): boolean {
				return typeof localStorage === "object" && typeof sessionStorage === "object";
			}
		}
	}
}
