namespace ZincDB {
	export namespace DB {
		type SQLStatement = [string, any[]];
		type SQLiteRowObject = { key: string, value: Uint8Array, metadata: Uint8Array };

		export class NodeSQLiteAdapter implements StorageAdapter {
			db: NodeSQLiteDatabase;
			readonly databaseFilePath: string;

			//////////////////////////////////////////////////////////////////////////////////////
			// Initialization operations
			//////////////////////////////////////////////////////////////////////////////////////
			constructor(public dbName: string, storageDirectory: string) {
				this.databaseFilePath = buildNodeDatabaseFilePath(dbName, storageDirectory);
			}

			async open(): Promise<void> {
				const operationPromise = new OpenPromise<void>();
				const SQLite3 = require("sqlite3").verbose();

				try {
					this.db = new SQLite3.Database(this.databaseFilePath, SQLite3.OPEN_READWRITE | SQLite3.OPEN_CREATE, (err: any) => {
						if (err === null) {
							operationPromise.resolve();
						} else {
							this.db = <any>undefined;
							operationPromise.reject(err);
						}
					});
				}
				catch (e) {
					this.db = <any>undefined;
					operationPromise.reject(e);
				}

				await operationPromise;
				await this.runSQL("PRAGMA synchronous=NORMAL");
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Object store operations
			//////////////////////////////////////////////////////////////////////////////////////
			async createObjectStoresIfNeeded(objectStoreNames: string[]): Promise<void> {
				if (!this.isOpen) {
					throw new Error("Database is not open");
				}

				const statements: SQLStatement[] = objectStoreNames.map<SQLStatement>((objectStoreName) =>
					[`CREATE TABLE IF NOT EXISTS "${objectStoreName}" (key TEXT PRIMARY KEY ON CONFLICT REPLACE, value BLOB, metadata BLOB)`, []]
				);

				return this.runSQLTransaction(statements);
			}

			async deleteObjectStores(objectStoreNames: string[]): Promise<void> {
				if (!this.isOpen) {
					throw new Error("Database is not open");
				}

				const statements = objectStoreNames.map<SQLStatement>((objectStoreName) =>
					[`DROP TABLE IF EXISTS "${objectStoreName}"`, []]
				);

				return this.runSQLTransaction(statements);
			}

			async clearObjectStores(objectStoreNames: string[]): Promise<void> {
				if (!this.isOpen) {
					throw new Error("Database is not open");
				}

				const statements = objectStoreNames.map<SQLStatement>((objectStoreName) =>
					[`DELETE from "${objectStoreName}"`, []]
				);

				return this.runSQLTransaction(statements);
			}

			async getObjectStoreNames(): Promise<string[]> {
				if (!this.isOpen) {
					throw new Error("Database is not open");
				}

				const queryResults: any[] = await this.runSQL(`SELECT name FROM sqlite_master WHERE type="table" ORDER BY name`, []);
				const results: any[] = [];

				for (const queryResult of queryResults) {
					if (queryResult.name !== "__WebKitDatabaseInfoTable__")
						results.push(queryResult.name);
				}

				return results;
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Write operations
			//////////////////////////////////////////////////////////////////////////////////////			
			async set(transactionObject: { [objectStoreName: string]: { [key: string]: Entry<any> } }): Promise<void> {
				if (!this.isOpen)
					throw new Error("Database is not open");

				const statements: SQLStatement[] = [];

				for (const objectStoreName in transactionObject) {
					const operationsForObjectstore = transactionObject[objectStoreName];

					for (const key in operationsForObjectstore) {
						if (operationsForObjectstore[key] == null) {
							statements.push([`DELETE FROM "${objectStoreName}" WHERE key=?`, [key]]);
						}
						else {
							const rowObject = NodeSQLiteAdapter.serializeRowObject(operationsForObjectstore[key]);
							statements.push([`INSERT INTO "${objectStoreName}" (key, value, metadata) VALUES (?, ?, ?)`, [rowObject.key, rowObject.value, rowObject.metadata]])
						}
					}
				}

				return this.runSQLTransaction(statements);
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Read operations
			//////////////////////////////////////////////////////////////////////////////////////
			async get<V>(key: string, objectStoreName: string, indexName?: string): Promise<Entry<V>>
			async get<V>(keys: string[], objectStoreName: string, indexName?: string): Promise<Entry<V>[]>
			async get<V>(keyOrKeys: string | string[], objectStoreName: string, indexName?: string): Promise<Entry<V> | Entry<V>[] | undefined> {
				if (typeof keyOrKeys === "string") {
					const rows = await this.runSQL(`SELECT key, value, metadata FROM "${objectStoreName}" WHERE key=?;`, [keyOrKeys]);

					if (rows.length === 0) {
						return undefined;
					}

					return NodeSQLiteAdapter.deserializeRowObject(rows[0]);
				} else if (Array.isArray(keyOrKeys)) {
					if (keyOrKeys.length === 0)
						return [];

					let query = `SELECT key, value, metadata FROM "${objectStoreName}" WHERE key=?`;

					for (let i = 0; i < keyOrKeys.length - 1; i++)
						query += ` OR key=?`;

					const rows = await this.runSQL(query, keyOrKeys);

					const resultLookup: EntryObject<V> = {};
					for (const row of rows) {
						const entry = NodeSQLiteAdapter.deserializeRowObject(row);
						resultLookup[entry.key] = entry;
					}

					const results: EntryArray<V> = [];
					for (const key of keyOrKeys)
						results.push(resultLookup[key]);

					return results;
				}
				else
					throw new Error("get: invalid first argument type");
			}

			async has(key: string, objectStoreName: string, indexName?: string): Promise<boolean>;
			async has(keys: string[], objectStoreName: string, indexName?: string): Promise<boolean[]>;
			async has(keyOrKeys: string | string[], objectStoreName: string, indexName?: string): Promise<boolean | boolean[]> {
				if (typeof keyOrKeys === "string") {
					const rows = await this.runSQL(`SELECT key FROM "${objectStoreName}" WHERE key=?`, [keyOrKeys]);
					return rows.length > 0;
				} else if (Array.isArray(keyOrKeys)) {
					if (keyOrKeys.length === 0)
						return [];

					let query = `SELECT key FROM "${objectStoreName}" WHERE key=?`;

					for (let i = 0; i < keyOrKeys.length - 1; i++)
						query += ` OR key=?`;

					const rows = await this.runSQL(query, keyOrKeys);
					const keySet = new StringSet();

					for (const row of rows)
						keySet.add(row.key);

					return keyOrKeys.map((key) => keySet.has(key))
				} else {
					throw new TypeError("First argument must be a string or array of strings.");
				}
			}

			async getAll<V>(objectStoreName: string): Promise<Entry<V>[]> {
				const rows = await this.runSQL(`SELECT key, value, metadata FROM "${objectStoreName}" ORDER BY key`, []);
				const results: Entry<V>[] = [];

				for (const row of rows)
					results.push(NodeSQLiteAdapter.deserializeRowObject(row));

				return results;
			}

			async getAllKeys(objectStoreName: string, indexName?: string): Promise<string[]> {
				const rows = await this.runSQL(`SELECT key FROM "${objectStoreName}" ORDER BY key`, []);
				const results: string[] = [];

				for (const row of rows)
					results.push(row.key);

				return results;
			}

			async count(filter: any, objectStoreName: string): Promise<number> {
				const rows = await this.runSQL(`SELECT count(key) FROM "${objectStoreName}"`, []);
				return rows[0]["count(key)"];
			}

			async createIterator(objectStoreName: string,
				indexName: string,
				options: {},
				onIteration: (result: Entry<any>) => Promise<void>
			): Promise<void> {
				if (!this.isOpen)
					throw new Error("Database is not open");

				const allKeys = await this.getAllKeys(objectStoreName);

				for (const key of allKeys) {
					await onIteration(await this.get(key, objectStoreName));
				}
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Finalization operations
			//////////////////////////////////////////////////////////////////////////////////////
			async close(): Promise<void> {
				if (!this.isOpen)
					return

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

				return operationPromise;
			}

			async destroy(): Promise<void> {
				if (!this.isOpen)
					throw new Error("Database is not open");

				const names = await this.getObjectStoreNames();
				await this.deleteObjectStores(names);
				await this.close();

				try {
					const NodeFS: typeof fs = require("fs")
					NodeFS.unlinkSync(this.databaseFilePath);
				}
				catch (e) {
				}
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
			private async runSQLTransaction(statements: SQLStatement[]): Promise<void> {
				await this.runSQL("BEGIN TRANSACTION");

				for (const statement of statements) {
					await this.runSQL(statement[0], statement[1]);
				}

				await this.runSQL("COMMIT TRANSACTION");
			}

			private async runSQL(statement: string, params: any[] = []): Promise<any[]> {
				const operationPromise = new OpenPromise<any[]>();

				this.db.all(statement, params, (err: any, rows: any[]) => {
					if (err == null) {
						operationPromise.resolve(rows);
					} else {
						operationPromise.reject(err);
					}
				});

				return operationPromise;
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Static methods
			//////////////////////////////////////////////////////////////////////////////////////
			static get isAvailable(): boolean {
				return runningInNodeJS() && typeof require("sqlite3") === "object";
			}

			private static serializeRowObject(entry: Entry<any>): SQLiteRowObject {
				return {
					key: entry.key,
					value: Encoding.OmniBinary.encode(entry.value),
					metadata: Encoding.OmniBinary.encode(entry.metadata)
				}
			}

			private static deserializeRowObject(rowObject: SQLiteRowObject): Entry<any> {
				return {
					key: rowObject.key,
					value: Encoding.OmniBinary.decode(rowObject.value),
					metadata: Encoding.OmniBinary.decode(rowObject.metadata)
				}
			}
		}
	}
}
