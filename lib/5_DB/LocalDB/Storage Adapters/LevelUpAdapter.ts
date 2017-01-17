namespace ZincDB {
	export namespace DB {
		export class LevelUpAdapter implements StorageAdapter {
			db: LevelUp.Database;
			databaseFilePath: string;

			//////////////////////////////////////////////////////////////////////////////////////
			// Initialization operations
			//////////////////////////////////////////////////////////////////////////////////////
			constructor(public dbName: string, storageDirectory: string) {
				this.databaseFilePath = buildNodeDatabaseFilePath(dbName, storageDirectory);
			}

			async open(): Promise<void> {
				if (this.isOpen)
					return;

				const operationPromise = new OpenPromise<void>();
				const levelUp: typeof LevelUp.levelup = require("levelup");
				this.db = levelUp(this.databaseFilePath, {
					keyEncoding: "utf8",
					valueEncoding: "binary"
				});

				this.db.open((err) => {
					if (err == null) {
						operationPromise.resolve();
					} else {
						this.db = <any>undefined;
						operationPromise.reject(err);
					}
				});

				await operationPromise;
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Object store operations
			//////////////////////////////////////////////////////////////////////////////////////
			async createObjectStoresIfNeeded(objectStoreNames: string[]): Promise<void> {
				if (!this.isOpen)
					throw new Error("Database is not open");

				const currentObjectStoreNames = await this.getObjectStoreNames();

				for (const objectStoreName of objectStoreNames) {
					if (currentObjectStoreNames.indexOf(objectStoreName) === -1)
						currentObjectStoreNames.push(objectStoreName);
				}

				await this.putRawValue("@objectStoreNames", Encoding.OmniBinary.encode(currentObjectStoreNames));
			}

			async deleteObjectStores(objectStoreNames: string[]): Promise<void> {
				if (!this.isOpen)
					throw new Error("Database is not open");

				await this.clearObjectStores(objectStoreNames);
				const currentObjectStoreNames = await this.getObjectStoreNames();

				const newObjectStoreNames = currentObjectStoreNames.filter((name) => objectStoreNames.indexOf(name) === -1);
				await this.putRawValue("@objectStoreNames", Encoding.OmniBinary.encode(newObjectStoreNames));
			}

			async clearObjectStores(objectStoreNames: string[]): Promise<void> {
				if (!this.isOpen)
					throw new Error("Database is not open");

				const encodedObjectStoreNames = objectStoreNames.map((name) => LevelUpAdapter.encodeObjectStoreName(name));

				const batch: LevelUp.BatchOperation[] = [];

				for (const prefix of encodedObjectStoreNames) {
					await this.createRawIterator({ keys: true, values: false, gte: prefix, lte: prefix + String.fromCharCode(65535) }, (result) => {
						batch.push({ type: "del", key: result.key! });
					});
				}

				await this.execBatch(batch);
			}

			async getObjectStoreNames(): Promise<string[]> {
				if (!this.isOpen)
					throw new Error("Database is not open");

				const encodedObjectStoreNames = await this.getRawValue("@objectStoreNames");

				if (encodedObjectStoreNames) {
					return Encoding.OmniBinary.decode(encodedObjectStoreNames);
				} else {
					return [];
				}
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Write operations
			//////////////////////////////////////////////////////////////////////////////////////			
			async set(transactionObject: { [objectStoreName: string]: { [key: string]: Entry<any> } }): Promise<void> {
				if (!this.isOpen)
					throw new Error("Database is not open");

				const knownObjectStoreNames = await this.getObjectStoreNames();
				const batch: LevelUp.BatchOperation[] = [];

				for (const objectStoreName in transactionObject) {
					if (knownObjectStoreNames.indexOf(objectStoreName) === -1)
						throw new Error(`Object store '${objectStoreName}' does not exist in the database`);

					const objectStoreNamePrefix = LevelUpAdapter.encodeObjectStoreName(objectStoreName);
					const operationsForObjectstore = transactionObject[objectStoreName];

					for (const key in operationsForObjectstore) {
						const entry = operationsForObjectstore[key];

						if (entry == null) {
							batch.push({ type: "del", key: objectStoreNamePrefix + key });
						}
						else {
							batch.push({ type: "put", key: objectStoreNamePrefix + key, value: LevelUpAdapter.serializeValueAndMetadata(entry) });
						}
					}
				}

				await this.execBatch(batch);
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Read operations
			//////////////////////////////////////////////////////////////////////////////////////			
			async get<V>(key: string, objectStoreName: string, indexName?: string): Promise<Entry<V>>
			async get<V>(keys: string[], objectStoreName: string, indexName?: string): Promise<Entry<V>[]>
			async get<V>(keyOrKeys: string | string[], objectStoreName: string, indexName?: string): Promise<Entry<V> | Entry<V>[] | undefined> {
				if (!this.isOpen)
					throw new Error("Database is not open");

				if (typeof keyOrKeys === "string") {
					const encodedEntry = await this.getRawValue(LevelUpAdapter.encodeObjectStoreName(objectStoreName) + keyOrKeys);

					if (encodedEntry == null)
						return undefined;

					return { key: keyOrKeys, ...LevelUpAdapter.deserializeValueAndMetadata(encodedEntry) };
				} else if (Array.isArray(keyOrKeys)) {
					if (keyOrKeys.length === 0)
						return [];

					const encodedObjectStoreName = LevelUpAdapter.encodeObjectStoreName(objectStoreName)
					const promises: Promise<Uint8Array>[] = [];

					for (const key of keyOrKeys) {
						promises.push(this.getRawValue(encodedObjectStoreName + key));
					}

					const encodedEntries = await Promise.all(promises);
					const results: Entry<any>[] = [];

					for (let i = 0; i < encodedEntries.length; i++) {
						const encodedEntry = encodedEntries[i];

						if (encodedEntry == null)
							results.push(<any>undefined);
						else
							results.push({ key: keyOrKeys[i], ...LevelUpAdapter.deserializeValueAndMetadata(encodedEntry) });
					}

					return results;
				}
				else
					throw new Error("get: invalid first argument type");
			}

			async has(key: string, objectStoreName: string): Promise<boolean>;
			async has(keys: string[], objectStoreName: string): Promise<boolean[]>;
			async has(keyOrKeys: string | string[], objectStoreName: string): Promise<boolean | boolean[]> {
				if (typeof keyOrKeys === "string") {
					return (await this.get<any>(keyOrKeys, objectStoreName)) != null;
				} else if (Array.isArray(keyOrKeys)) {
					const results = await this.get<any>(keyOrKeys, objectStoreName);
					return results.map((result) => result != null);
				} else
					throw new Error("get: invalid first argument type");
			}

			async getAll<V>(objectStoreName: string): Promise<Entry<V>[]> {
				if (!this.isOpen)
					throw new Error("Database is not open");

				const prefix = LevelUpAdapter.encodeObjectStoreName(objectStoreName);
				const matchingEntries: Entry<any>[] = [];

				await this.createRawIterator({ keys: true, values: true, gte: prefix, lte: prefix + String.fromCharCode(65535) }, (result) => {
					matchingEntries.push({ key: result.key!.substr(prefix.length), ...LevelUpAdapter.deserializeValueAndMetadata(result.value!) });
				});

				return matchingEntries;
			}

			async getAllKeys(objectStoreName: string): Promise<string[]> {
				if (!this.isOpen)
					throw new Error("Database is not open");

				const prefix = LevelUpAdapter.encodeObjectStoreName(objectStoreName);
				const matchingKeys: string[] = [];

				await this.createRawIterator({ keys: true, values: false, gte: prefix, lte: prefix + String.fromCharCode(65535) }, (result) => {
					const key = result.key!;

					if (Tools.stringStartsWith(key, prefix)) {
						matchingKeys.push(key.substr(prefix.length));
					}
				});

				return matchingKeys;
			}

			async count(filter: any, objectStoreName: string): Promise<number> {
				if (!this.isOpen)
					throw new Error("Database is not open");

				return (await this.getAllKeys(objectStoreName)).length;
			}

			async createIterator(objectStoreName: string,
				indexName: string,
				options: {},
				onIteration: (result: Entry<any>) => Promise<void>
			): Promise<void> {
				if (!this.isOpen)
					throw new Error("Database is not open");

				const prefix = LevelUpAdapter.encodeObjectStoreName(objectStoreName);
				const operationPromise = new OpenPromise<void>();

				await this.createRawIterator({ keys: true, values: true, gte: prefix, lte: prefix + String.fromCharCode(65535) }, (result) => {
					onIteration({ key: result.key!.substr(prefix.length), ...LevelUpAdapter.deserializeValueAndMetadata(result.value!) })
						.catch((err) => operationPromise.reject(err));
				});

				operationPromise.resolve();
				return operationPromise;
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Finalization operations
			//////////////////////////////////////////////////////////////////////////////////////
			async close(): Promise<void> {
				if (!this.isOpen)
					return;

				const operationPromise = new OpenPromise<void>();

				this.db.close((err) => {
					if (err == null) {
						operationPromise.resolve();
						this.db = <any>undefined;
					} else {
						operationPromise.reject(err);
						this.db = <any>undefined;
					}
				});

				await operationPromise;
			}

			async destroy(): Promise<void> {
				if (!this.isOpen)
					throw new Error("Database is not open");

				await this.close();

				const operationPromise = new OpenPromise<void>();
				const leveldown: typeof LevelDown = require("leveldown");

				leveldown.destroy(this.databaseFilePath, (err) => {
					if (err == null) {
						operationPromise.resolve();
					} else {
						operationPromise.reject(err);
					}
				});

				await operationPromise;
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Getters
			//////////////////////////////////////////////////////////////////////////////////////
			get isOpen() {
				return this.db !== undefined;
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Private operations
			//////////////////////////////////////////////////////////////////////////////////////
			private async putRawValue(key: string, value: Uint8Array): Promise<void> {
				const operationPromise = new OpenPromise<void>();

				this.db.put(key, value, (err) => {
					if (err == null) {
						operationPromise.resolve();
					} else {
						operationPromise.reject(err);
					}
				});

				await operationPromise;
			}

			private async getRawValue(key: string): Promise<Uint8Array> {
				const operationPromise = new OpenPromise<Uint8Array>();

				this.db.get(key, (err, value) => {
					if (err == null) {
						operationPromise.resolve(value);
					} else {
						if (err.name === "NotFoundError") {
							operationPromise.resolve(undefined);
						} else {
							operationPromise.reject(err);
						}
					}
				});

				return await operationPromise;
			}

			private async execBatch(batch: LevelUp.BatchOperation[], options?: LevelUp.BatchOptions) {
				const operationPromise = new OpenPromise<void>();

				this.db.batch(batch, options, (err) => {
					if (err == null)
						operationPromise.resolve();
					else
						operationPromise.reject(err);
				});

				await operationPromise;
			}

			private async createRawIterator(options: LevelUp.ReadStreamOptions,
				onIteration: (result: { key?: string; value?: Uint8Array }) => void
			): Promise<void> {
				if (!this.isOpen)
					throw new Error("Database is not open");

				const operationPromise = new OpenPromise<void>();

				const stream = this.db.createReadStream(options);

				stream.on("data", (data: string | { key: string, value: Uint8Array }) => {
					try {
						if (options.keys && options.values)
							onIteration(<any>data);
						else if (options.keys)
							onIteration({ key: <any>data });
						else if (options.values)
							onIteration({ value: <any>data });
						else
							onIteration({});
					}
					catch (e) {
						operationPromise.reject(e);
					}
				});

				stream.on("error", (err: any) => {
					operationPromise.reject(err);
				});

				stream.on("close", () => {
					operationPromise.reject(new PromiseCanceledError());
				});

				stream.on("end", () => {
					operationPromise.resolve();;
				});

				await operationPromise;
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Static methods
			//////////////////////////////////////////////////////////////////////////////////////
			static get isAvailable(): boolean {
				return runningInNodeJS() && typeof require("levelup") === "function" && typeof require("leveldown") === "function";
			}

			private static encodeObjectStoreName(name: string): string {
				return Keypath.stringify([name]);
			}

			private static serializeValueAndMetadata(entry: Entry<any>): Uint8Array {
				return ArrayTools.concatUint8Arrays([
					Encoding.UTF8.encode(Tools.stringifyJSONOrUndefined(entry.metadata) + "\t"),
					Encoding.OmniBinary.encode(entry.value)
				]);
			}

			private static deserializeValueAndMetadata(serializedValueAndMetadata: Uint8Array): { value: any, metadata: EntryMetadata } {
				const firstTabCharacterLocation = serializedValueAndMetadata.indexOf(9);
				if (firstTabCharacterLocation === -1)
					throw new Error("Found a serialized value with no tab separator");

				const metadata = Tools.parseJSONOrUndefined(Encoding.UTF8.decode(serializedValueAndMetadata.subarray(0, firstTabCharacterLocation)))
				const value = Encoding.OmniBinary.decode(serializedValueAndMetadata.subarray(firstTabCharacterLocation + 1));

				return { metadata, value }
			}
		}
	}
}
