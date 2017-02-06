namespace ZincDB {
	export namespace DB {
		describe("Storage adapters:", () => {
			const dbName = "StorageAdapterTest_" + JSRandom.getWordCharacterString(10);

			testStorageAdapter("InMemory", new InMemoryAdapter(dbName));

			if (WebStorageAdapter.isAvailable)
				testStorageAdapter("LocalStorage", new WebStorageAdapter(dbName, "LocalStorage"));

			if (WebStorageAdapter.isAvailable)
				testStorageAdapter("SessionStorage", new WebStorageAdapter(dbName, "SessionStorage"));

			if (IndexedDBAdapter.isAvailable)
				testStorageAdapter("IndexedDB", new IndexedDBAdapter(dbName));

			if (WebSQLAdapter.isAvailable)
				testStorageAdapter("WebSQL", new WebSQLAdapter(dbName));

			if (NodeSQLiteAdapter.isAvailable)
				testStorageAdapter("SQLite", new NodeSQLiteAdapter(dbName, `tests/temp`));

			if (LevelUpAdapter.isAvailable)
				testStorageAdapter("LevelUP", new LevelUpAdapter(dbName, `tests/temp`));


			function testStorageAdapter(adapterName: LocalDBOptions['storageMedium'], db: StorageAdapter) {
				describe(`Storage adapter: '${adapterName}'`, () => {
					const testEntry1: Entry<any> = { key: "key1", value: "Hello World!", metadata: { updateTime: 1000, commitTime: 2000 } };
					const testEntry2: Entry<any> = { key: "key2", value: { "Testing this": { "Hey": 95123.43 } }, metadata: { updateTime: 1001, commitTime: 2001 } };
					const testEntry3: Entry<any> = { key: "key3", value: new Uint8Array([1, 2, 3, 4, 5]), metadata: { updateTime: 1002, commitTime: 2002 } };
					const testEntry4: Entry<any> = { key: "key4", value: { "Hi": ["a a a", 342, true, null], "yo o": [{ a: "bbb" }] }, metadata: { updateTime: 1003, commitTime: 2003 } };

					beforeEach(async () => {
						await db.open();
						const objectStoreNames = await db.getObjectStoreNames();
						await db.deleteObjectStores(objectStoreNames);
						await db.createObjectStoresIfNeeded(["testObjectStore1", "testObjectStore2", "testObjectStore3"]);
					});

					afterEach(async () => {
						await db.close();
					});

					it("Sets and retrieves a single entry", async () => {
						await db.set({ "testObjectStore1": { "key1": testEntry1 } });
						expect(await db.get<any>("key1", "testObjectStore1")).toEqual(testEntry1);
					});

					it("Sets and retrieves multiple entries", async () => {
						await db.set({ "testObjectStore1": { "key1": testEntry1, "key2": testEntry2, "key3": testEntry3 } });
						expect(await db.get<any>(["key2", "key1", "key3", "key4"], "testObjectStore1")).toEqual([testEntry2, testEntry1, testEntry3, undefined]);
					});

					it("Sets and retrieves entries containing typed arrays, date, and regexp objects", async () => {
						const complexEntry1 = {
							key: "key1", value: [1, 2, new Int16Array([-1, -2]), new Float32Array([-4232.12, -66666.321]), new Date(), /^abc$/g], metadata: { updateTime: 1000, commitTime: 2000 }
						};

						const complexEntry2 = {
							key: "key2", value: { a: new Float64Array([-13423432.4444, 2234324.5555]), b: [new Date(4321), /^aasabc$/gi] }, metadata: { updateTime: 1000, commitTime: 2000 }
						};

						await db.set({
							"testObjectStore1": { "key1": complexEntry1 },
							"testObjectStore2": { "key2": complexEntry2 }
						});

						expect(await db.get<any>("key1", "testObjectStore1")).toEqual(complexEntry1);
						expect(await db.get<any>("key2", "testObjectStore2")).toEqual(complexEntry2);
					});

					it("Sets and then both sets and deletes multiple entries", async () => {
						await db.set({ "testObjectStore1": { "key1": testEntry1, "key2": testEntry2, "key3": testEntry3 } });
						await db.set({ "testObjectStore1": { "key1": null, "key3": null, "key4": testEntry4 } });
						expect(await db.get(["key1", "key2", "key3", "key4"], "testObjectStore1")).toEqual([undefined, testEntry2, undefined, testEntry4]);
						await db.set({ "testObjectStore1": { "key1": testEntry1, "key2": testEntry2, "key3": testEntry3, "key4": null } });
						expect(await db.get(["key1", "key2", "key3", "key4"], "testObjectStore1")).toEqual([testEntry1, testEntry2, testEntry3, undefined]);
					});

					it("Checks for existence of a single entry", async () => {
						await db.set({ "testObjectStore1": { "key1": testEntry1 } });
						expect(await db.has("key1", "testObjectStore1")).toEqual(true);
						expect(await db.has("key2", "testObjectStore1")).toEqual(false);
					});

					it("Checks for existence of multiple entries", async () => {
						await db.set({ "testObjectStore1": { "key1": testEntry1, "key2": testEntry2, "key3": testEntry3 } });
						expect(await db.has(["key2", "key1", "key5", "key3", "key4"], "testObjectStore1")).toEqual([true, true, false, true, false]);
					});

					it("Counts all entries", async () => {
						await db.set({ "testObjectStore1": { "key1": testEntry1, "key2": testEntry2, "key3": testEntry3 } });
						expect(await db.count({}, "testObjectStore1")).toEqual(3);
					});

					it("Gets all entries", async () => {
						await db.set({ "testObjectStore1": { "key1": testEntry1, "key2": testEntry2, "key3": testEntry3, "key4": testEntry4 } });
						expect(await db.getAll("testObjectStore1")).toEqual([testEntry1, testEntry2, testEntry3, testEntry4]);
					});

					it("Gets all keys", async () => {
						await db.set({ "testObjectStore1": { "key1": testEntry1, "key2": testEntry2, "key3": testEntry3, "key4": testEntry4 } });
						expect(await db.getAllKeys("testObjectStore1")).toEqual(["key1", "key2", "key3", "key4"]);
					});

					it("Opens and executes an iterator", async () => {
						await db.set({ "testObjectStore1": { "key1": testEntry1, "key2": testEntry2, "key3": testEntry3, "key4": testEntry4 } });

						let iterationNumber = 1;

						const onIteratorResult = async (result: DB.Entry<any>) => {
							if (iterationNumber === 1)
								expect(result).toEqual(testEntry1);
							else if (iterationNumber === 2)
								expect(result).toEqual(testEntry2);
							else if (iterationNumber === 3)
								expect(result).toEqual(testEntry3);
							else if (iterationNumber === 4)
								expect(result).toEqual(testEntry4);

							iterationNumber++;
						}

						await db.createIterator("testObjectStore1", undefined, {}, onIteratorResult);
					});

					it("Gets object store names", async () => {
						expect(await db.getObjectStoreNames()).toEqual(["testObjectStore1", "testObjectStore2", "testObjectStore3"]);
					});

					it("Clears all records from an object store", async () => {
						await db.set({ "testObjectStore1": { "key1": testEntry1, "key2": testEntry2, "key3": testEntry3, "key4": testEntry4 } });
						await db.set({ "testObjectStore2": { "key1": testEntry1, "key4": testEntry4 } });
						expect(await db.count({}, "testObjectStore1")).toEqual(4);
						expect(await db.count({}, "testObjectStore2")).toEqual(2);
						await db.clearObjectStores(["testObjectStore1"])
						expect(await db.count({}, "testObjectStore1")).toEqual(0);
						expect(await db.count({}, "testObjectStore2")).toEqual(2);
						await db.clearObjectStores(["testObjectStore2"])
						expect(await db.count({}, "testObjectStore2")).toEqual(0);
					});

					it("Deletes and creates new object stores", async () => {
						await db.deleteObjectStores(["testObjectStore2"]);
						expect(await db.getObjectStoreNames()).toEqual(["testObjectStore1", "testObjectStore3"]);
						await db.createObjectStoresIfNeeded(["testObjectStore4"]);
						expect(await db.getObjectStoreNames()).toEqual(["testObjectStore1", "testObjectStore3", "testObjectStore4"]);
					});

					it("Destroys the database", async () => {
						await db.destroy();
						expect(true).toBe(true);
					});
				});
			}
		});
	}
}
