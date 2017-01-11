namespace ZincDB {
	if (runningInNodeJS()) {
		global["openDatabase"] = require('websql');
	}

	export namespace DB {
		export class WebSQLAdapter implements StorageAdapter {
			db: Database;

			constructor(public dbName: string) {
			}

			async open(): Promise<void> {
				try {
					this.db = openDatabase(this.dbName, "", this.dbName, 4 * 1024 * 1024);
				}
				catch (e) {
					throw (e);
				}
			}

			async createObjectStoresIfNeeded(objectStoreNames: string[]) {
				if (!this.isOpen) {
					throw new Error("Database is not open");
				}

				const newVersion = (parseInt(this.db.version || "0") + 1).toString();

				const operationPromise = new OpenPromise();

				const executor = (t: SqlTransaction) => {
					for (const objectStoreName of objectStoreNames)
						t.executeSql(`CREATE TABLE IF NOT EXISTS "${objectStoreName}" (key TEXT PRIMARY KEY ON CONFLICT REPLACE, value TEXT, metadata TEXT)`);
				}

				if (this.db.changeVersion) {
					this.db.changeVersion(this.db.version, newVersion, executor,
						(e) => operationPromise.reject(new Error(e.message)),
						() => operationPromise.resolve());
				} else {
					// For compatibility with node-websql, which doesn't currently support 'changeVersion'
					this.db.transaction(executor,
						(e) => operationPromise.reject(new Error(e.message)),
						() => operationPromise.resolve());
				}

				await operationPromise;
			}

			async deleteObjectStores(objectStoreNames: string[]): Promise<void> {
				if (!this.isOpen) {
					throw new Error("Database is not open");
				}

				const newVersion = (parseInt(this.db.version || "0") + 1).toString();

				const operationPromise = new OpenPromise();

				const executor = (t: SqlTransaction) => {
					for (const objectStoreName of objectStoreNames)
						t.executeSql(`DROP TABLE IF EXISTS "${objectStoreName}"`)
				}

				if (this.db.changeVersion) {
					this.db.changeVersion(this.db.version, newVersion, executor,
						(e) => operationPromise.reject(new Error(e.message)),
						() => operationPromise.resolve());
				} else {
					// For compatibility with node-websql, which doesn't currently support 'changeVersion'
					this.db.transaction(executor,
						(e) => operationPromise.reject(new Error(e.message)),
						() => operationPromise.resolve());
				}

				await operationPromise;
			}

			async clearObjectStores(objectStoreNames: string[]): Promise<void> {
				if (!this.isOpen) {
					throw new Error("Database is not open");
				}

				const operationPromise = new OpenPromise();
				this.db.transaction((t) => {
					for (const objectStoreName of objectStoreNames)
						t.executeSql(`DELETE from "${objectStoreName}"`)
				},
					(e) => operationPromise.reject(new Error(e.message)),
					() => operationPromise.resolve());

				await operationPromise;
			}

			async getObjectStoreNames(): Promise<string[]> {
				if (!this.isOpen) {
					throw new Error("Database is not open");
				}

				const operationPromise = new OpenPromise<string[]>();
				this.db.readTransaction((t) => {
					t.executeSql(`SELECT name FROM sqlite_master WHERE type="table" ORDER BY name`, [], (t, resultSet) => {
						const results: string[] = [];

						for (let i = 0; i < resultSet.rows.length; i++) {
							const name = resultSet.rows.item(i).name;

							if (name !== "__WebKitDatabaseInfoTable__")
								results.push(name);
						}

						operationPromise.resolve(results);
					}, (t, e) => operationPromise.reject(new Error(e.message)))
				});

				return await operationPromise;
			}

			async set(transactionObject: { [objectStoreName: string]: { [key: string]: Entry<any> } }): Promise<void> {
				if (!this.isOpen)
					throw new Error("Database is not open");

				const operationPromise = new OpenPromise<void>();
				this.db.transaction((t) => {
					for (const objectStoreName in transactionObject) {
						const operationsForObjectstore = transactionObject[objectStoreName];

						for (const key in operationsForObjectstore) {
							if (operationsForObjectstore[key] == null) {
								t.executeSql(`DELETE FROM "${objectStoreName}" WHERE key=?`, [key]);
							}
							else {
								const rowObject = WebSQLAdapter.serializeToRowObject(operationsForObjectstore[key]);
								t.executeSql(`INSERT INTO "${objectStoreName}" (key, value, metadata) VALUES (?, ?, ?)`, [rowObject.key, rowObject.value, rowObject.metadata])
							}
						}
					}
				},
					(e) => operationPromise.reject(new Error(e.message)),
					() => operationPromise.resolve());

				await operationPromise;
			}

			async get<V>(key: string, objectStoreName: string, indexName?: string): Promise<Entry<V>>
			async get<V>(keys: string[], objectStoreName: string, indexName?: string): Promise<Entry<V>[]>
			async get<V>(keyOrKeys: string | string[], objectStoreName: string, indexName?: string): Promise<Entry<V> | Entry<V>[] | undefined> {
				if (typeof keyOrKeys === "string") {
					const resultSet = await this.runSingleQueryReadTransaction(`SELECT key, value, metadata FROM "${objectStoreName}" WHERE key=?;`, [keyOrKeys]);
					const length = resultSet.rows.length;

					if (length === 0) {
						return undefined;
					}

					return WebSQLAdapter.parseRowObject(resultSet.rows.item(0));
				} else if (Array.isArray(keyOrKeys)) {
					if (keyOrKeys.length === 0)
						return [];

					let query = `SELECT key, value, metadata FROM "${objectStoreName}" WHERE key=?`;

					for (let i = 0; i < keyOrKeys.length - 1; i++)
						query += ` OR key=?`;

					const resultSet = await this.runSingleQueryReadTransaction(query, keyOrKeys);

					const resultLookup: EntryObject<V> = {};
					for (let i = 0; i < resultSet.rows.length; i++) {
						const entry = WebSQLAdapter.parseRowObject(resultSet.rows.item(i));
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
					const resultSet = await this.runSingleQueryReadTransaction(`SELECT key FROM "${objectStoreName}" WHERE key=?`, [keyOrKeys]);
					return resultSet.rows.length > 0;
				} else if (Array.isArray(keyOrKeys)) {
					if (keyOrKeys.length === 0)
						return [];

					let query = `SELECT key FROM "${objectStoreName}" WHERE key=?`;

					for (let i = 0; i < keyOrKeys.length - 1; i++)
						query += ` OR key=?`;

					const resultSet = await this.runSingleQueryReadTransaction(query, keyOrKeys);
					const keySet = new StringSet();

					for (let i = 0; i < resultSet.rows.length; i++)
						keySet.add(resultSet.rows.item(i).key);

					return keyOrKeys.map((key) => keySet.has(key))
				} else {
					throw new TypeError("First argument must be a string or array of strings.");
				}
			}

			async getAll<V>(objectStoreName: string): Promise<Entry<V>[]> {
				const resultSet = await this.runSingleQueryReadTransaction(`SELECT key, value, metadata FROM "${objectStoreName}" ORDER BY key`, []);
				const results: Entry<V>[] = [];

				for (let i = 0; i < resultSet.rows.length; i++)
					results.push(WebSQLAdapter.parseRowObject(resultSet.rows.item(i)));

				return results;
			}

			async getAllKeys(objectStoreName: string, indexName?: string): Promise<string[]> {
				const resultSet = await this.runSingleQueryReadTransaction(`SELECT key FROM "${objectStoreName}" ORDER BY key`, []);
				const results: string[] = [];

				for (let i = 0; i < resultSet.rows.length; i++)
					results.push(resultSet.rows.item(i).key);

				return results;
			}

			async count(filter: any, objectStoreName: string): Promise<number> {
				const resultSet = await this.runSingleQueryReadTransaction(`SELECT count(key) FROM "${objectStoreName}"`, []);
				return resultSet.rows.item(0)["count(key)"];
			}

			private runSingleQueryReadTransaction(sql: string, args?: any[]): Promise<SqlResultSet> {
				return new Promise((resolve, reject) => {
					if (!this.isOpen) {
						reject(new Error("Database is not open"));
						return;
					}

					this.db.readTransaction((t) => {
						t.executeSql(sql, args, (t, resultSet) => {
							resolve(resultSet);
						}, (t, e) => reject(new Error(e.message)));
					}, (e) => reject(new Error(e.message)));
				});
			}

			async createIterator(objectStoreName: string,
				indexName: string,
				options: {},
				onIteration: (result: Entry<any>, transactionContext: any, moveNext: Action, onError: (e: Error) => void) => void
			): Promise<void> {
				if (!this.isOpen)
					throw new Error("Database is not open");

				const allKeys = await this.getAllKeys(objectStoreName);

				for (const key of allKeys) {
					const iterationPromise = new OpenPromise<void>();

					this.get(key, objectStoreName)
						.then((value) => {
							onIteration(value, null, () => iterationPromise.resolve(), (e) => iterationPromise.reject(e));
						}).catch((e) => iterationPromise.reject(e));

					await iterationPromise;
				}
			}

			async close(): Promise<void> {
				this.db = <any>undefined;
			}

			async destroy(): Promise<void> {
				const names = await this.getObjectStoreNames();
				await this.deleteObjectStores(names);
				await this.close();
			}

			get isOpen() {
				return this.db !== undefined;
			}

			static get isAvailable(): boolean {
				return typeof openDatabase === "function";
			}

			static serializeToRowObject(entry: Entry<any>): RowObject {
				return {
					key: entry.key,
					value: Encoding.OmniString.encode(entry.value),
					metadata: Encoding.OmniString.encode(entry.metadata)
				}
			}

			static parseRowObject(rowObject: RowObject): Entry<any> {
				return {
					key: rowObject.key,
					value: Encoding.OmniString.decode(rowObject.value),
					metadata: Encoding.OmniString.decode(rowObject.metadata)
				}
			}
		}

		type RowObject = { key: string, value: string, metadata: string };
	}
}
