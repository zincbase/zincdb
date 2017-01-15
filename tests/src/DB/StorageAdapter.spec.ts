namespace ZincDB {
	export namespace DB {
		const dbName = "testSuite-" + JSRandom.getWordCharacterString(10);

		testStorageAdapter("InMemory", new InMemoryAdapter(dbName));

		if (IndexedDBAdapter.isAvailable)
			testStorageAdapter("IndexedDB", new IndexedDBAdapter(dbName));

		if (WebSQLAdapter.isAvailable)
			testStorageAdapter("WebSQL", new WebSQLAdapter(dbName));

		if (NodeSQLiteAdapter.isAvailable)
			testStorageAdapter("SQLite", new NodeSQLiteAdapter(dbName, `tests/temp`));

		function testStorageAdapter(adapterName: LocalDBOptions['storageMedium'], db: StorageAdapter) {
			describe(`Storage adapter: '${adapterName}'`, () => {
				const testEntry1 = { key: "key1", value: "value1", metadata: { timestamp: 1000, longevity: 1000 } };
				const testEntry2 = { key: "key2", value: "value2", metadata: { timestamp: 1001, longevity: 1000 } };
				const testEntry3 = { key: "key3", value: "value3", metadata: { timestamp: 1002, longevity: 1000 } };
				const testEntry4 = { key: "key4", value: "value4", metadata: { timestamp: 1003, longevity: 1000 } };

				beforeEach(async () => {
					await db.open();
					if ((await db.getObjectStoreNames()).indexOf("testObjectStore1") >= 0)
						await db.clearObjectStores(["testObjectStore1"]);

					await db.createObjectStoresIfNeeded(["testObjectStore1"]);
				});

				afterEach(async () => {
					await db.close();
				});

				it("Opens DB", async () => {
					await db.open()
					expect(true).toBe(true);
				});

				it("Deletes and creates new object stores", async () => {
					await db.deleteObjectStores(["testObjectStore1"]);
					expect(await db.getObjectStoreNames()).toEqual([]);
					await db.createObjectStoresIfNeeded(["testObjectStore1"]);
					expect(await db.getObjectStoreNames()).toEqual(["testObjectStore1"]);
				});

				it("Sets and retrieves a single record", async () => {
					await db.set({ "testObjectStore1": { "key1": testEntry1 } });
					expect(await db.get<string>("key1", "testObjectStore1")).toEqual(testEntry1);
				});

				it("Sets and retrieves multiple records", async () => {
					await db.set({ "testObjectStore1": { "key1": testEntry1, "key2": testEntry2, "key3": testEntry3 } });
					expect(await db.get<string>(["key2", "key1", "key3", "key4"], "testObjectStore1")).toEqual([testEntry2, testEntry1, testEntry3, undefined]);
				});

				it("Sets and then both sets and deletes multiple records", async () => {
					await db.set({ "testObjectStore1": { "key1": testEntry1, "key2": testEntry2, "key3": testEntry3 } });
					await db.set({ "testObjectStore1": { "key1": null, "key3": null, "key4": testEntry4 } });
					expect(await db.get(["key1", "key2", "key3", "key4"], "testObjectStore1")).toEqual([undefined, testEntry2, undefined, testEntry4]);
					await db.set({ "testObjectStore1": { "key1": testEntry1, "key2": testEntry2, "key3": testEntry3, "key4": null } });
					expect(await db.get(["key1", "key2", "key3", "key4"], "testObjectStore1")).toEqual([testEntry1, testEntry2, testEntry3, undefined]);
				});

				it("Checks for existence of a single record", async () => {
					await db.set({ "testObjectStore1": { "key1": testEntry1 } });
					expect(await db.has("key1", "testObjectStore1")).toEqual(true);
					expect(await db.has("key2", "testObjectStore1")).toEqual(false);
				});

				it("Checks for existence of multiple records", async () => {
					await db.set({ "testObjectStore1": { "key1": testEntry1, "key2": testEntry2, "key3": testEntry3 } });
					expect(await db.has(["key2", "key1", "key5", "key3", "key4"], "testObjectStore1")).toEqual([true, true, false, true, false]);
				});

				it("Counts all records", async () => {
					await db.set({ "testObjectStore1": { "key1": testEntry1, "key2": testEntry2, "key3": testEntry3 } });					
					expect(await db.count({}, "testObjectStore1")).toEqual(3);
				});

				it("Gets all records", async () => {
					await db.set({ "testObjectStore1": { "key1": testEntry1, "key2": testEntry2, "key3": testEntry3 } });
					expect(await db.getAll("testObjectStore1")).toEqual([testEntry1, testEntry2, testEntry3]);
				});

				it("Gets all keys", async () => {
					await db.set({ "testObjectStore1": { "key1": testEntry1, "key2": testEntry2, "key3": testEntry3 } });					
					expect(await db.getAllKeys("testObjectStore1")).toEqual(["key1", "key2", "key3"]);
				});

				it("Opens and executes an iterator", async () => {
					await db.set({ "testObjectStore1": { "key1": testEntry1, "key2": testEntry2, "key3": testEntry3 } });

					let iterationNumber = 1;

					const onIteratorResult = (result: DB.Entry<any>, transaction: IDBTransaction, moveNext: Action) => {
						if (iterationNumber === 1)
							expect(result).toEqual(testEntry1);
						else if (iterationNumber === 2)
							expect(result).toEqual(testEntry2);
						else if (iterationNumber === 3)
							expect(result).toEqual(testEntry3);

						iterationNumber++;

						expect(typeof moveNext === "function");
						moveNext();
					}

					await db.createIterator("testObjectStore1", undefined, {}, onIteratorResult);
				});

				it("Clears all records from an object store", async () => {
					await db.set({ "testObjectStore1": { "key1": testEntry1, "key2": testEntry2, "key3": testEntry3 } });
					await db.clearObjectStores(["testObjectStore1"])
					expect(await db.count({}, "testObjectStore1")).toEqual(0);
				});

				it("Gets object store names", async () => {
					expect (await db.getObjectStoreNames()).toEqual(["testObjectStore1"]);
				});

				it("Deletes an object store", async () =>
				{
					await db.deleteObjectStores(["testObjectStore1"]);
					expect (await db.getObjectStoreNames()).toEqual([]);
				});

				it("Destroys the database", async () => {
					await db.destroy();
					expect(true).toBe(true);
				});
			});
		}
	}
}