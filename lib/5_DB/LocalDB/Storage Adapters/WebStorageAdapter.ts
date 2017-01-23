namespace ZincDB {
	export namespace DB {
		type MetadataAndValue = { metadata: EntryMetadata, value: any };

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
				this.opened = true;
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Object store operations
			//////////////////////////////////////////////////////////////////////////////////////
			async createObjectStoresIfNeeded(objectStoreNames: string[]): Promise<void> {
				const newObjectStoreNames = await this.getObjectStoreNames();

				for (const objectStoreName of objectStoreNames) {
					if (newObjectStoreNames.indexOf(objectStoreName) === -1) {
						newObjectStoreNames.push(objectStoreName);
					}
				}

				this.setRawValue("@objectStoreNames", Encoding.JsonX.encode(newObjectStoreNames), undefined);
			}

			async deleteObjectStores(objectStoreNames: string[]): Promise<void> {
				await this.clearObjectStores(objectStoreNames);

				const currentObjectStoreNames = await this.getObjectStoreNames();
				const newObjectStoreNames = currentObjectStoreNames.filter((name) => objectStoreNames.indexOf(name) === -1);

				this.setRawValue("@objectStoreNames", Encoding.JsonX.encode(newObjectStoreNames), undefined);
			}

			async clearObjectStores(objectStoreNames: string[]): Promise<void> {
				const objectStorePrefixes = objectStoreNames.map((objectStoreName) => this.getObjectStorePrefix(objectStoreName));

				this.getAllWebStorageKeys().forEach((key) => {
					if (objectStorePrefixes.some((objectStorePrefix) => Tools.stringStartsWith(key, objectStorePrefix)))
						this.webStorage.removeItem(key);
				});
			}

			async getObjectStoreNames(): Promise<string[]> {
				return Encoding.JsonX.decode(<string> this.getRawValue("@objectStoreNames", undefined)) || [];
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Write operations
			//////////////////////////////////////////////////////////////////////////////////////
			async set(transactionObject: { [objectStoreName: string]: { [key: string]: Entry<any> } }): Promise<void> {
				const objectStoreNames = await this.getObjectStoreNames();

				for (const objectStoreName in transactionObject)
					if (objectStoreNames.indexOf(objectStoreName) === -1)
						throw new Error(`Object store '${objectStoreName}' does not exist.`)

				for (const objectStoreName in transactionObject) {
					const operationsForObjectstore = transactionObject[objectStoreName];

					for (const key in operationsForObjectstore) {
						const entry = operationsForObjectstore[key];

						if (entry == null)
							this.deleteKey(key, objectStoreName);
						else
							this.setRawValue(key, this.encodeEntryMetadataAndValue(entry), objectStoreName);
					}
				}
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Read operations
			//////////////////////////////////////////////////////////////////////////////////////
			async get<V>(key: string, objectStoreName: string): Promise<Entry<V>>
			async get<V>(keys: string[], objectStoreName: string): Promise<Entry<V>[]>
			async get<V>(keyOrKeys: string | string[], objectStoreName: string): Promise<Entry<V> | Entry<V>[]> {
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
				const allKeys = await this.getAllKeys(objectStoreName);
				return allKeys.map((key) => this.getEntry(key, objectStoreName));
			}

			async getAllKeys(objectStoreName: string): Promise<string[]> {
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
				return (await this.getAllKeys(objectStoreName)).length;
			}

			async createIterator(objectStoreName: string,
				indexName: string | undefined,
				options: {},
				onIteration: (result: Entry<any>) => Promise<void>
			): Promise<void> {
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
				await this.deleteObjectStores(await this.getObjectStoreNames());
				await this.webStorage.removeItem(this.encodeToRawKey("@objectStoreNames", undefined));
				await this.close();
			}

			get isOpen() {
				return this.opened;
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Private methods
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

			private getEntry(key: string, objectStoreName: string): Entry<any> {
				const rawValue = this.getRawValue(key, objectStoreName);
				if (rawValue == null)
					return <any> undefined;
				
				return { key, ...this.decodeValueAndMetadata(rawValue) };				
			}

			private getRawValue(key: string, objectStoreName: string | undefined): string | null {
				return this.webStorage.getItem(this.encodeToRawKey(key, objectStoreName));
			}

			private setRawValue(key: string, value: string, objectStoreName: string | undefined): void {
				this.webStorage.setItem(this.encodeToRawKey(key, objectStoreName), value);
			}

			private deleteKey(key: string, objectStoreName: string | undefined): void {
				this.webStorage.removeItem(this.encodeToRawKey(key, objectStoreName));
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
			// Static methods
			//////////////////////////////////////////////////////////////////////////////////////
			static get isAvailable(): boolean {
				return typeof localStorage === "object" && typeof sessionStorage === "object";
			}
		}
	}
}
