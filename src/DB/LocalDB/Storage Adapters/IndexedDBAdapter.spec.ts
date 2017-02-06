namespace ZincDB {
	export namespace DB {
		describe("Storage adapters:", () => {
			if (IndexedDBAdapter.isAvailable) {
				describe("IndexedDBAdapter specialized tests:", () => {
					let db: IndexedDBAdapter;

					const testEntry1: Entry<any> = { key: "key1", value: "value1", metadata: { updateTime: 1 } };
					const testEntry2: Entry<any> = { key: "key2", value: "value2", metadata: { updateTime: 2 } };
					const testEntry3: Entry<any> = { key: "key3", value: "value3", metadata: { updateTime: 3 } };
					const testEntry4: Entry<any> = { key: "key4", value: "value4", metadata: { updateTime: 4 } };

					beforeEach(async () => {
						db = new IndexedDBAdapter("testSuite");
						await db.open();
					});

					afterEach(async () => {
						await db.close();
					});

					after(async () => {
						await db.destroy();
					});

					it("Opens DB", async () => {
						await db.open();
						expect(true).toBe(true);
					});

					it("Creates a new object store", async () => {
						await db.createObjectStoresIfNeeded(["testObjectStore1"]);
						expect(true).toBe(true);
					});

					it("Sets and retrieves a single record", async () => {
						await db.set({ "testObjectStore1": { "key1": testEntry1 } });
						expect(await db.get("key1", "testObjectStore1")).toEqual(testEntry1);
					});

					it("Sets and retrieves multiple records", async () => {
						await db.set({ "testObjectStore1": { "key1": testEntry1, "key2": testEntry2, "key3": testEntry3 } });
						expect(await db.get(["key2", "key1", "key3"], "testObjectStore1")).toEqual([testEntry2, testEntry1, testEntry3]);
					});

					it("Sets and then both sets and deletes multiple records", async () => {
						await db.set({ "testObjectStore1": { "key1": testEntry1, "key2": testEntry2, "key3": testEntry3 } });
						await db.set({ "testObjectStore1": { "key1": null, "key3": null, "key4": testEntry4 } });
						expect(await db.get(["key1", "key2", "key3", "key4"], "testObjectStore1")).toEqual([undefined, testEntry2, undefined, testEntry4]);
						await db.set({ "testObjectStore1": { "key1": testEntry1, "key2": testEntry2, "key3": testEntry3, "key4": null } });
						expect(await db.get(["key1", "key2", "key3", "key4"], "testObjectStore1")).toEqual([testEntry1, testEntry2, testEntry3, undefined]);
					});

					it("Counts all records", async () => {
						expect(await db.count({}, "testObjectStore1")).toEqual(3);
					});

					it("Counts records in key range", async () => {
						expect(await db.count({ lowerBound: "key2" }, "testObjectStore1")).toEqual(2);
					});

					it("Counts records equal to a particular key", async () => {
						expect(await db.count({ equals: "key3" }, "testObjectStore1")).toEqual(1);
					});

					it("Gets all records", async () => {
						expect(await db.getAll("testObjectStore1")).toEqual([{ key: "key1", value: "value1", metadata: { updateTime: 1 } }, { key: "key2", value: "value2", metadata: { updateTime: 2 } }, { key: "key3", value: "value3", metadata: { updateTime: 3 } }]);
					});

					it("Gets records in key range", async () => {
						expect(await db.getRange({ lowerBound: "key2" }, "testObjectStore1")).toEqual([{ key: "key2", value: "value2", metadata: { updateTime: 2 } }, { key: "key3", value: "value3", metadata: { updateTime: 3 } }]);
					});

					it("Gets all keys", async () => {
						expect(await db.getAllKeys("testObjectStore1")).toEqual(["key1", "key2", "key3"]);
					});

					it("Gets keys in range", async () => {
						const result = await db.getKeyRange({ lowerBound: "key2", upperBound: "key3" }, "testObjectStore1");
						expect(result).toEqual([{ primaryKey: "key2", key: "key2" }, { primaryKey: "key3", key: "key3" }]);
					});

					it("Creates an index", async () => {
						await db.createIndex("valueIndex", "testObjectStore1", "value");
						const result = await db.getIndexList("testObjectStore1");
						expect(result.contains("valueIndex")).toBe(true);
					});

					it("Overwriting an existing index", async () => {
						let result = await db.getIndexList("testObjectStore1");
						expect(result.contains("valueIndex")).toBe(true);
						await db.createIndex("valueIndex", "testObjectStore1", "value")
						result = await db.getIndexList("testObjectStore1");
						expect(result.contains("valueIndex")).toBe(true);
					});

					it("Gets multiple records by index keys", async () => {
						const result = await db.get(["value3", "value1"], "testObjectStore1", "valueIndex");
						expect(result).toEqual([{ key: "key3", value: "value3", metadata: { updateTime: 3 } }, { key: "key1", value: "value1", metadata: { updateTime: 1 } }]);
					});

					it("Gets records in index range", async () => {
						const result = await db.getRange({ lowerBound: "value2", upperBound: "value3" }, "testObjectStore1", "valueIndex");
						expect(result).toEqual([{ key: "key2", value: "value2", metadata: { updateTime: 2 } }, { key: "key3", value: "value3", metadata: { updateTime: 3 } }]);
					});

					it("Gets keys in index range", async () => {
						const result = await db.getKeyRange({ lowerBound: "value2", upperBound: "value3" }, "testObjectStore1", "valueIndex");
						expect(result).toEqual([{ primaryKey: "key2", key: "value2" }, { primaryKey: "key3", key: "value3" }]);
					});

					it("Counts records in index range", async () => {
						expect(await db.count({ upperBound: "value2" }, "testObjectStore1", "valueIndex")).toEqual(2);
					});

					it("Counts records equal to a particular index key", async () => {
						expect(await db.count({ equals: "value3" }, "testObjectStore1", "valueIndex")).toEqual(1);
					});

					it("Opens and executes an iterator", async () => {
						let iterationNumber = 1;

						const onIteration = async (result: DB.Entry<any>, transaction: IDBTransaction) => {
							//log(iterationNumber)
							if (iterationNumber === 1)
								expect(result).toEqual(testEntry1);
							else if (iterationNumber === 2)
								expect(result).toEqual(testEntry2);
							else if (iterationNumber === 3)
								expect(result).toEqual(testEntry3);

							//expect(transaction instanceof IDBTransaction).toBe(true);

							iterationNumber++;
						}

						await db.createIterator("testObjectStore1", undefined, {}, onIteration);
					});

					it("Opens and executes an iterator that starts new request at every iteration", async () => {
						let iterationNumber = 1;

						const onIteratorResult = async (result: DB.Entry<any>, transaction: IDBTransaction) => {
							if (iterationNumber === 1)
								expect(result).toEqual(testEntry1);
							else if (iterationNumber === 2)
								expect(result).toEqual(testEntry2);
							else if (iterationNumber === 3)
								expect(result).toEqual(testEntry3);

							//expect(transaction instanceof IDBTransaction).toBe(true);

							iterationNumber++;

							const requestPromise = new OpenPromise<void>();
							const request = transaction.objectStore("testObjectStore1").get(result.key);

							request.onsuccess = (e) => {
								expect(request.result).toEqual(result);
								requestPromise.resolve();
							}

							request.onerror = (e) => {
								requestPromise.reject(e);
							}

							await requestPromise;
						}

						await db.createIterator("testObjectStore1", undefined, {}, onIteratorResult);
					});

					it("Deletes an index", async () => {
						let result = await db.getIndexList("testObjectStore1");
						expect(result.contains("valueIndex")).toBe(true);
						await db.deleteIndex("valueIndex", "testObjectStore1");
						result = await db.getIndexList("testObjectStore1");
						expect(result.contains("valueIndex")).toBe(false);
					});

					it("Clears all records from an object store", async () => {
						await db.clearObjectStores(["testObjectStore1"])
						expect(await db.count({}, "testObjectStore1")).toEqual(0);
					});

					it("Deletes an object store", async () => {
						expect(db.db.objectStoreNames.length).toEqual(1);

						await db.deleteObjectStores(["testObjectStore1"]);
						expect(db.db.objectStoreNames.length).toEqual(0);
					});

					it("Destroys the database", async () => {
						await db.destroy();
						expect(true).toBe(true);
					});
				});

				describe("IndexedDBAdapter static methods:", () => {
					describe("readKeyPath", () => {
						it("Reads a simple object property by keypath, nesting level 0", () => {
							expect(IndexedDBAdapter.readKeypath({ "abcd": 3453 }, "abcd")).toEqual(3453);
						});

						it("Reads a simple object property by keypath, nesting level 1", () => {
							expect(IndexedDBAdapter.readKeypath({ "abcd": { "hi there": 9999 } }, "abcd.hi there")).toEqual(9999);
						});

						it("Reads a complex object property by keypath, nesting level 2", () => {
							expect(IndexedDBAdapter.readKeypath({ "Hello there!??": { "WOW!": { "baa": 234, "DAAAA": "wot/?" } } }, "Hello there!??.WOW!.DAAAA")).toEqual("wot/?");
						});
					});

					describe("writeKeyPath", () => {
						it("Writes a simple object property by keypath, nesting level 0", () => {
							expect(IndexedDBAdapter.writeKeypath({}, "abcd", 3453)).toEqual({ abcd: 3453 });
						});

						it("Writes a simple object property by keypath, nesting level 1", () => {
							expect(IndexedDBAdapter.writeKeypath({}, "abcd.hi there", 9999)).toEqual({ abcd: { "hi there": 9999 } });
						});

						it("Writes a complex object property by keypath, nesting level 2", () => {
							expect(IndexedDBAdapter.writeKeypath({ "Hello there!??": { "WOW!": { baa: 234 } } }, "Hello there!??.WOW!.DAAAA", "wot/?")).toEqual({ "Hello there!??": { "WOW!": { "baa": 234, "DAAAA": "wot/?" } } });
						});
					});
				});
			}
		});
	}
}
