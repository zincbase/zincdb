declare var ZincDBTestConfig: { host: string; accessKey: string }

namespace ZincDB {
	export namespace DB {
		describe(`LocalDB`, () => {
			runDBTests("InMemory", false);

			if (WebStorageAdapter.isAvailable)
				runDBTests("LocalStorage", false);

			if (WebStorageAdapter.isAvailable)
				runDBTests("SessionStorage", false);

			if (IndexedDBAdapter.isAvailable)
				runDBTests("IndexedDB", false);

			if (WebSQLAdapter.isAvailable)
				runDBTests("WebSQL", false);
			/*
			if (NodeSQLiteAdapter.isAvailable)
				runDBTests("SQLite", false);

			if (LevelUpAdapter.isAvailable)
				runDBTests("LevelDB", false);
			*/

			if (webWorkersAvailable()) {
				runDBTests("InMemory", true);

				if (IndexedDBAdapter.isAvailable)
					runDBTests("IndexedDB", true);
			}

			if (runningInNodeJS()) {
				runDBTests("InMemory", true);

				if (NodeSQLiteAdapter.isAvailable)
					runDBTests("SQLite", true);

				if (LevelUpAdapter.isAvailable)
					runDBTests("LevelDB", true);
			}

			function runDBTests(storageMedium: LocalDBOptions['storageMedium'], useWorker: boolean) {
				describe(`Persistence: ${storageMedium}, Uses worker: ${useWorker}:`, () => {
					describe("Basic operations on local entries only:", () => {
						let db: LocalDB;

						beforeEach(async () => {
							const dbOptions: Partial<LocalDBOptions> = {
								storageMedium,
								useWorker,
								storagePath: "tests/temp"
							}

							db = await open(`Test_${JSRandom.getWordCharacterString(10)}`, dbOptions);
						});

						afterEach(async () => {
							await db.destroyLocalData();
							db = <any>undefined;
						});

						it("Stores several nodes within a transaction", async () => {
							const dataObject = {
								"a": {
									"b": {
										"c": "Hello World!",
										"d": 1234,
										"e": {
											"f": true
										}
									},
									"g": { a: 123, b: "hi" },
								},
								"b": {
									"h": ["hey", { "x y z": "yo", "1 2 3": "bro" }]
								}
							}

							await db.transaction()
								.put(["a", "b", "c"], "Hello World!")
								.put(["a", "b", "d"], 1234)
								.put(["a", "b", "e", "f"], true)
								.put(["a", "g"], { a: 123, b: "hi" })
								.put(["b", "h"], ["hey", { "x y z": "yo", "1 2 3": "bro" }])
								.commit();

							expect(await db.get(["a", "b", "c"])).toEqual("Hello World!");

							expect(await db.get(["b", "h"])).toEqual(["hey", { "x y z": "yo", "1 2 3": "bro" }]);
							expect(await db.get(["b", "h", 1, "1 2 3"])).toEqual("bro");

							expect(await db.get([])).toEqual(dataObject);

							expect(await db.get(["a"])).toEqual(dataObject["a"]);

							expect(await db.get(["b"])).toEqual(dataObject["b"]);

							expect(await db.getMulti([["a", "b", "c"], ["b", "h"], ["b", "h", 1, "1 2 3"], [], ["a"], ["b"], "a", "b"]))
								.toEqual(["Hello World!", ["hey", { "x y z": "yo", "1 2 3": "bro" }], "bro", dataObject, dataObject["a"], dataObject["b"], dataObject["a"], dataObject["b"]]);
						});

						it("Stores and deletes several nodes using a transaction", async () => {
							await db.transaction()
								.put(["a", "b"], "yo")
								.put(["a", "c"], 25)
								.put(["a", "c"], "go")
								.delete(["a", "b"])
								.put(["a", "b"], true)
								.delete(["a", "b"])
								.put(["d", "b", "e f"], [1, 2, 3])
								.commit();

							expect(await db.getMulti([["a", "b"], ["a", "c"], ["d", "b", "e f"]]))
								.toEqual([undefined, "go", [1, 2, 3]]);
						});

						it("Stores nodes containing typed arrays, date and regexp objects", async () => {
							const complexObject1 = [1, 2, new Int16Array([-1, -2]), new Float32Array([-4232.12, -66666.321]), new Date(), /^abc$/g];
							const complexObject2 = { a: new Float64Array([-13423432.4444, 2234324.5555]), b: [new Date(4321), /^aasabc$/gi] };

							await db.transaction()
								.put(["a", "b"], complexObject1)
								.put(["a", "c"], complexObject2)
								.commit();

							expect(await db.getMulti([["a", "b"], ["a", "c"], "a"]))
								.toEqual([complexObject1, complexObject2, { b: complexObject1, c: complexObject2 }]);
						});

						it("Stores nodes containing randomly generated object trees", async () => {
							const rand = new SeededRandom();

							for (let i = 0; i < 50; i++) {
								const randomObject1 = RandomObject.generate(10, 3, rand);
								const randomObject2 = RandomObject.generate(10, 3, rand);

								await db.transaction()
									.put(["a", "b"], randomObject1)
									.put(["a", "c"], randomObject2)
									.commit();

								expect(await db.getMulti([["a", "b"], ["a", "c"], "a"]))
									.toEqual([randomObject1, randomObject2, { b: randomObject1, c: randomObject2 }]);
							}
						});

						it("Stores several nodes and then updates them", async () => {
							await db.transaction()
								.put(["a", "b"], "yo")
								.put(["a", "c"], { hey: 45 })
								.commit();

							await db.update(["a", "b"], "mo");
							expect(await db.get(["a", "b"])).toEqual("mo");
							expect(await db.get([])).toEqual({
								"a": {
									"b": "mo",
									"c": {
										hey: 45
									}
								}
							});

							await db.update(["a", "c", "hey"], 46);

							expect(await db.get([])).toEqual({
								"a": {
									"b": "mo",
									"c": {
										hey: 46
									}
								}
							});

							await db.update(["a"], {
								"c": [4, 3, 2, 1]
							});

							expect(await db.get([])).toEqual({
								"a": {
									"b": undefined,
									"c": [4, 3, 2, 1]
								}
							});
						});

						it("Allows to delete branches", async () => {
							await db.transaction()
								.put(["a", "b"], "yo")
								.put(["a", "c"], 25)
								.put(["b", "a"], [1, 2, 3])
								.commit();

							await db.delete(["a"]);

							expect(await db.getMulti([["a", "b"], ["a", "c"], ["b", "a"]]))
								.toEqual([undefined, undefined, [1, 2, 3]]);
						});

						it("Allows to delete value descendants", async () => {
							await db.transaction()
								.put(["a", "b"], [11, 22, { hey: "yo", ba: 555 }])
								.commit();

							await db.delete(["a", "b", 2, "hey"]);

							expect(await db.get(["a", "b"]))
								.toEqual([11, 22, { ba: 555 }]);
						});

						it("Stores and reads a transaction including Uint8Array objects", async () => {
							await db.transaction()
								.put(["hey ya", "yo"], new Uint8Array([1, 2, 3, 4]))
								.put(["hey ya", "do"], { x: 25, y: [4, 3, 2, 1] })
								.commit();

							expect(await db.getMulti([["hey ya", "yo"], ["hey ya", "do"], ["hey ya"], []]))
								.toEqual([
									new Uint8Array([1, 2, 3, 4]),
									{ x: 25, y: [4, 3, 2, 1] },
									{ yo: new Uint8Array([1, 2, 3, 4]), do: { x: 25, y: [4, 3, 2, 1] } },
									{ "hey ya": { yo: new Uint8Array([1, 2, 3, 4]), do: { x: 25, y: [4, 3, 2, 1] } } }
								]);

							expect((await db.get(["hey ya"])).yo instanceof Uint8Array);
						});

						it("Correctly processes a series of transactions", async () => {
							await db.transaction()
								.put(["a", "b"], "yo")
								.put(["a", "c"], 1234)
								.delete(["a", "c"])
								.commit();

							expect(await (db.get([]))).toEqual({
								a: {
									b: "yo"
								}
							});

							await db.transaction()
								.delete(["a", "c"])
								.put(["a", "c"], [4, 3, 2, 1])
								.put(["a", "c"], new Uint8Array([6, 5, 4, 3, 2, 1]))
								.put(["a", "d"], { x: "hello", y: [1, 2, 3, 4] })
								.commit();

							expect(await (db.get([]))).toEqual({
								a: {
									b: "yo",
									c: new Uint8Array([6, 5, 4, 3, 2, 1]),
									d: {
										x: "hello",
										y: [1, 2, 3, 4]
									}
								}
							});
						});

						it("Errors on invalid paths", async () => {
							await db.put(["a", "b"], 123);
							await expectPromiseToReject(db.put(["a", "b", "c"], "hi"));
							await expectPromiseToReject(db.put(["a"], true));
							await expectPromiseToReject(db.put(["a"], { b: 321 }));
							await expectPromiseToReject(db.put([], { "a": { "b": [1, 2, 3] } }));
						});

						it("Errors when trying to assign a node that is an ancestor or descendant to a node created earlier within the same transaction", async () => {
							const b1 = db.transaction();
							b1.put(["a", "b"], "yo");
							b1.put(["a"], 123);
							await expectPromiseToReject(b1.commit());

							const b2 = db.transaction();
							b2.put(["a", "b"], "yo");
							b2.put(["a", "b", "c"], 123);
							await expectPromiseToReject(b2.commit());

							// Should this one resolve or reject?
							const b3 = db.transaction();
							b3.put(["a", "b"], "yo");
							b3.delete(["a", "b"]);
							b3.put(["a", "b", "c"], 123);
							await expectPromiseToReject(b3.commit());
						});

						it("Errors when trying to update non-existing nodes", async () => {
							await db.transaction()
								.put(["a", "b"], "yo")
								.put(["a", "c"], { hey: 45 })
								.commit();

							await expectPromiseToReject(db.update(["b"], 24));
							await expectPromiseToReject(db.update(["a", "d"], "hi"));
						});

						it("Doesn't error when trying to delete non-existing nodes", async () => {
							await db.put(["a", "b"], "yo");
							await expectPromiseToResolve(db.delete(["aaa", "bbb", "ccc"]));
						});

						it("Allows updating nodes that were created earlier within the same transaction", async () => {
							// Update leaf:
							await db.transaction()
								.put(["a", "b"], "yo")
								.update(["a", "b"], { hey: 45 })
								.commit();

							expect(await db.get(["a", "b"])).toEqual({ hey: 45 });

							// Update a value's descendant property
							await db.transaction()
								.put(["c", "d"], { hi: "hello" })
								.update(["c", "d", "hi"], { x: 987 })
								.commit();

							expect(await db.get(["c", "d"])).toEqual({ hi: { x: 987 } });

							// Update a branch
							await db.transaction()
								.put(["e", "f"], 45)
								.put(["e", "g"], "yo man")
								.update(["e"], { f: 34, g: "hhhh" })
								.commit();

							expect(await db.get(["e", "f"])).toEqual(34);
							expect(await db.get(["e", "g"])).toEqual("hhhh");

							// Update a branch containing two previous nodes and one node that was created within the transaction
							await db.transaction()
								.put(["e", "h"], 12)
								.update(["e"], { f: 34, g: "hhhh", h: "kkk" })
								.commit();

							expect(await db.get(["e", "f"])).toEqual(34);
							expect(await db.get(["e", "g"])).toEqual("hhhh");
							expect(await db.get(["e", "h"])).toEqual("kkk");
						});

						it("Allows updating nodes that were updated earlier within the same transaction", async () => {
							await db.put(["a", "b"], 1234);
							await db.put(["a", "c"], "asdf");

							// Update leaf:
							await db.transaction()
								.update(["a", "b"], { hey: 45 })
								.update(["a", "b"], { yo: 12 })
								.commit();

							expect(await db.get(["a", "b"])).toEqual({ yo: 12 });

							// Update a value's descendant property
							await db.transaction()
								.update(["a", "b"], { x: "baba" })
								.update(["a", "b", "y"], 999)
								.commit();

							expect(await db.get(["a", "b"])).toEqual({ x: "baba", y: 999 });
						});

						it("Errors on an attempt to update a branch containing an unknown node", async () => {
							await db.put(["a", "b"], 1234);

							// Update branch
							const b = db.transaction();
							b.put(["a", "c"], "asdf");
							b.update(["a"], { b: 1234, c: "gggg", d: "mmmm" });
							expectPromiseToReject(b.commit());
						});

						it("Adds to a safe list", async () => {
							const key1 = await db.addListItem(["a", "b"], "Hi");
							const key2 = await db.addListItem(["a", "b"], 45);

							expect(typeof key1).toEqual("string");
							expect(typeof key2).toEqual("string");
							expect(key1.length).toEqual(16);
							expect(key2.length).toEqual(16);
							expect(await db.get(["a", "b", key1])).toEqual("Hi");
							expect(await db.get(["a", "b", key2])).toEqual(45);
						});

						it("Appends to a safe list within a transaction operation", async () => {
							await db.transaction()
								.appendListItem(["a", "b"], "Hi")
								.appendListItem(["a", "b"], 45)
								.commit();

							const list = await db.get(["a", "b"]);
							expect(ObjectTools.countDefinedOwnPropertiesInObject(list)).toEqual(2);

							for (const itemKey in list) {
								const item = list[itemKey]
								expect(item === "Hi" || item === 45).toBe(true);
							}
						});

						it("Checks for existence of nodes and value descendants", async () => {
							await db.transaction()
								.put(["a", "b"], { x: "baba" })
								.put(["a", "c"], [44, 55, 66])
								.commit();

							expect(await db.has(["a", "b"])).toEqual(true);
							expect(await db.has(["a", "b", "x"])).toEqual(true);
							expect(await db.has(["a", "b", "y"])).toEqual(false);
							expect(await db.has(["a"])).toEqual(true);
							expect(await db.has([])).toEqual(true);
							expect(await db.has(["a", "c", 2])).toEqual(true);
							expect(await db.has(["a", "c", 3])).toEqual(false);
						});

						it("Checks for existence of multiple nodes and value descendants", async () => {
							await db.transaction()
								.put(["a", "b"], { x: "baba" })
								.put(["a", "c"], [44, 55, 66])
								.commit();

							expect(await db.hasMulti(["a", ["a", "b"], ["a", "b", "x"], ["a", "b", "y"], ["a", "c", 2], ["a", "c", 3]]))
								.toEqual([true, true, true, false, true, false]);
						});

						it("Gets a list of all leaf paths", async () => {
							await db.transaction()
								.put(["a", "b"], { x: "baba" })
								.put(["a", "c"], [44, 55, 66])
								.put(["d", "v", "u"], [44, 55, 66])
								.commit();

							expect(await db.getLeafPaths()).toEqual([["a", "b"], ["a", "c"], ["d", "v", "u"]]);
						});

						it("Gets a list of all leaf paths descendants of a particular base node path", async () => {
							await db.transaction()
								.put(["a", "b"], { x: "baba" })
								.put(["a", "c"], [44, 55, 66])
								.put(["d", "v", "u"], [44, 55, 66])
								.commit();

							expect(await db.getLeafPaths(["a"])).toEqual([["a", "b"], ["a", "c"]]);
							expect(await db.getLeafPaths(["d"])).toEqual([["d", "v", "u"]]);
							expect(await db.getLeafPaths(["e"])).toEqual([]);
							expect(await db.getLeafPaths(["a", "c"])).toEqual([]);
							expect(await db.getLeafPaths(["a", "c", "g"])).toEqual([]);
						});

						it("Observes and notifies on changes", () => {
							return new Promise((resolve) => {
								let observersNotified = 0;

								const countCallbacks = () => {
									observersNotified++;
									if (observersNotified === 5)
										resolve();
								};

								db.observe(["a", "b"], (changes) => {
									expect(changes.newValue).toEqual({ yo: "go", do: 123 });
									countCallbacks();
								});

								db.observe(["a", "c", "d"], (changes) => {
									expect(changes.newValue).toEqual(["ba", 21, { molo: "kkkk" }]);
									countCallbacks();
								});

								db.observe(["a"], (changes) => {
									expect(changes.newValue).toEqual({ b: { yo: "go", do: 123 }, c: { d: ["ba", 21, { molo: "kkkk" }] } });
									countCallbacks();
								});

								db.observe([], (changes) => {
									expect(changes.newValue).toEqual({ a: { b: { yo: "go", do: 123 }, c: { d: ["ba", 21, { molo: "kkkk" }] } } });
									countCallbacks();
								});

								db.observe(["a", "c", "d", 2, "molo"], (changes) => {
									expect(changes.newValue).toEqual("kkkk");
									countCallbacks();
								});


								db.transaction()
									.put(["a", "b"], { yo: "go", do: 123 })
									.put(["a", "c", "d"], ["ba", 21, { molo: "kkkk" }])
									.commit();
							});
						});

						it("Rejects less than two arguments to 'put'", async () => {
							await expectPromiseToReject(db.put.call(db, ["a", "b"]));
						});

						it("Rejects less than two arguments to 'update'", async () => {
							await db.put(["a", "b"], 321);
							await expectPromiseToReject(db.update.call(db, ["a", "b"]));
						});

						it("Accepts plain strings as paths to 'put' and 'get'", async () => {
							await db.put("Great News!", 63445);
							expect(await db.get("Great News!")).toEqual(63445);
						});
					});

					describe("Basic operations involving a remote server:", () => {
						let db: LocalDB;

						if (typeof ZincDBTestConfig === "undefined") {
							log("Skipped tests requiring a remote server as a global ZincDB test configuration object was not found in scope.");
							return;
						}

						if (ZincDBTestConfig.host == null || ZincDBTestConfig.accessKey == null) {
							log("Skipped tests requiring a remote server as a global ZincDB test configuration object was found but did not contain a 'host' or 'accessKey' properties.");
							return;
						}

						beforeEach(async () => {
							const dbName = JSRandom.getWordCharacterString(10);

							const dbOptions: Partial<LocalDBOptions> = {
								storageMedium,
								useWorker,
								remoteSyncURL: `${ZincDBTestConfig.host}/datastore/${dbName}`,
								remoteAccessKey: ZincDBTestConfig.accessKey,
								encryptionKey: "4d2d3fb0356cf6a66617e6454641697b",
								verifyServerCertificate: false,
								storagePath: "tests/temp"
							}

							db = await open(`Test_${dbName}`, dbOptions );

							await db.syncClient.rewrite([]);
						});

						afterEach(async () => {
							await db.destroyLocalData();
							await db.destroyRemoteData();

							db = <any>undefined;
						});

						it("Pushes to a remote server", async () => {
							await db.transaction()
								.put(["a", "b"], { yo: "go", do: 123 })
								.put(["a", "c", "d"], ["ba", 21, { molo: "kkkk" }])
								.put(["a", "c", "e"], new Uint8Array([1, 2, 3, 4]))
								.commit();

							await db.pushLocalChanges();
							expect(await db.getLocalChanges()).toEqual([]);
							expect(await db.get([])).toEqual({
								a: {
									b: { yo: "go", do: 123 },
									c: {
										d: ["ba", 21, { molo: "kkkk" }],
										e: new Uint8Array([1, 2, 3, 4])
									}
								}
							});
							expect((await db.get(["a", "c", "e"])) instanceof Uint8Array).toBe(true);

							await db.put(["a", "b"], { yo: "so", do: 123 });
							expect(await db.get([])).toEqual({
								a: {
									b: { yo: "so", do: 123 },
									c: {
										d: ["ba", 21, { molo: "kkkk" }],
										e: new Uint8Array([1, 2, 3, 4])
									}
								}
							});

							await db.discardLocalChanges()
							expect(await db.get([])).toEqual({
								a: {
									b: { yo: "go", do: 123 },
									c: {
										d: ["ba", 21, { molo: "kkkk" }],
										e: new Uint8Array([1, 2, 3, 4])
									}
								}
							});
						});

						it("Pushes entries containing typed array, date and regexp objects", async () => {
							const complexObject1 = [1, 2, new Int16Array([-1, -2]), new Float32Array([-4232.12, -66666.321]), new Date(), /^abc$/g];
							const complexObject2 = { a: new Float64Array([-13423432.4444, 2234324.5555]), b: [new Date(4321), /^aasabc$/gi] };
							const simpleObject = { a: [4, true, null], b: "ok" };

							await db.transaction()
								.put(["a", "b"], complexObject1)
								.put(["a", "c"], complexObject2)
								.put(["b", "d"], simpleObject)
								.commit();

							await db.pushLocalChanges();
							expect(await db.getLocalChanges()).toEqual([]);

							const remoteDatastoreContent = await db.syncClient.read();

							expect(remoteDatastoreContent.length).toEqual(4);

							expect(remoteDatastoreContent[0].key).toEqual("");

							expect(remoteDatastoreContent[1].key).toEqual("['a']['b']");
							expect(remoteDatastoreContent[1].value).toEqual(complexObject1);

							expect(remoteDatastoreContent[2].key).toEqual("['a']['c']");
							expect(remoteDatastoreContent[2].value).toEqual(complexObject2);

							expect(remoteDatastoreContent[3].key).toEqual("['b']['d']");
							expect(remoteDatastoreContent[3].value).toEqual(simpleObject);
						})

						it("Pushes a series of entries containing randomly generated object trees", async () => {
							const rand = new SeededRandom();

							for (let i = 0; i < 25; i++) {
								const randomObject1 = RandomObject.generate(10, 3, rand);
								const randomObject2 = RandomObject.generate(10, 3, rand);

								await db.transaction()
									.put(["a", "b"], randomObject1)
									.put(["a", "c"], randomObject2)
									.commit();

								await db.pushLocalChanges();
								expect(await db.getLocalChanges()).toEqual([]);

								const remoteDatastoreContent = await db.syncClient.read();

								expect(remoteDatastoreContent.length).toEqual(3);

								expect(remoteDatastoreContent[0].key).toEqual("");

								expect(remoteDatastoreContent[1].key).toEqual("['a']['b']");
								expect(remoteDatastoreContent[1].value).toEqual(randomObject1);

								expect(remoteDatastoreContent[2].key).toEqual("['a']['c']");
								expect(remoteDatastoreContent[2].value).toEqual(randomObject2);
							}
						});

						it("Pulls from a remote server", async () => {
							const updateTime = Timer.getMicrosecondTimestamp();

							const entries1: EntryArray<any> = [
								{ key: "['a']['b']", value: { yo: "go", do: 123 }, metadata: { updateTime } },
								{ key: "['a']['c']['d']", value: ["ba", 21, { molo: "kkkk" }], metadata: { updateTime } },
								{ key: "['a']['c']['e']", value: new Uint8Array([1, 2, 3, 4]), metadata: { updateTime } },
							];

							const entries2: EntryArray<any> = [
								{ key: "['a']['b']", value: { yo: "so", do: 123 }, metadata: { updateTime } },
								{ key: "['a']['c']['e']", value: new Uint8Array([1, 2, 3, 5]), metadata: { updateTime } },
							];

							await db.syncClient.write(entries1);
							await db.pullRemoteChanges();

							expect((await db.get(["a", "c", "e"])) instanceof Uint8Array).toBe(true);
							expect(await db.get([])).toEqual({
								a: {
									b: { yo: "go", do: 123 },
									c: {
										d: ["ba", 21, { molo: "kkkk" }],
										e: new Uint8Array([1, 2, 3, 4])
									}
								}
							});

							await db.syncClient.write(entries2);
							await db.pullRemoteChanges();

							expect((await db.get(["a", "c", "e"])) instanceof Uint8Array).toBe(true);
							expect(await db.get([])).toEqual({
								a: {
									b: { yo: "so", do: 123 },
									c: {
										d: ["ba", 21, { molo: "kkkk" }],
										e: new Uint8Array([1, 2, 3, 5])
									}
								}
							});
						});

						it("Pulls entries containing typed array, date and regexp objects", async () => {
							const complexObject1 = [1, 2, new Int16Array([-1, -2]), new Float32Array([-4232.12, -66666.321]), new Date(), /^abc$/g];
							const complexObject2 = { a: new Float64Array([-13423432.4444, 2234324.5555]), b: [new Date(4321), /^aasabc$/gi] };
							const simpleObject = { a: [4,true, null], b: "ok" };

							const updateTime = Timer.getMicrosecondTimestamp();

							const complexEntries: EntryArray<any> = [
								{ key: "['a']['b']", value: complexObject1, metadata: { updateTime } },
								{ key: "['a']['c']", value: complexObject2, metadata: { updateTime } },
								{ key: "['b']['d']", value: simpleObject, metadata: { updateTime } },
							];

							await db.syncClient.write(complexEntries);
							await db.pullRemoteChanges();

							expect(await db.getMulti([["a", "b"], ["a", "c"], "a", ["b", "d"]]))
								.toEqual([complexObject1, complexObject2, { b: complexObject1, c: complexObject2 }, simpleObject]);
						});

						function testContinuousPull(useWebSocket: boolean) {
							it(`Continuously pulls from a remote server. Websocket enabled: ${useWebSocket}.`, () => {
								const updateTime = Timer.getMicrosecondTimestamp();

								return new Promise(async (resolve) => {
									const entries1: EntryArray<any> = [
										{ key: "['a']['b']", value: { yo: "go", do: 123 }, metadata: { updateTime } },
										{ key: "['a']['c']['d']", value: ["ba", 21, { molo: "kkkk" }], metadata: { updateTime } },
										{ key: "['a']['c']['e']", value: new Uint8Array([1, 2, 3, 4]), metadata: { updateTime } },
									]

									const entries2: EntryArray<any> = [
										{ key: "['a']['b']", value: { yo: "so", do: 123 }, metadata: { updateTime } },
										{ key: "['a']['c']['e']", value: new Uint8Array([1, 2, 3, 5]), metadata: { updateTime } }
									]

									let iteration = 1;
									db.observe([], async (changes) => {
										expect((await db.get(["a", "c", "e"])) instanceof Uint8Array).toBe(true);

										if (iteration === 1) {
											expect(changes.newValue).toEqual({
												a: {
													b: { yo: "go", do: 123 },
													c: {
														d: ["ba", 21, { molo: "kkkk" }],
														e: new Uint8Array([1, 2, 3, 4])
													}
												}
											});

											iteration++
											await db.syncClient.write(entries2);
										} else if (iteration === 2) {
											expect(changes.newValue).toEqual({
												a: {
													b: { yo: "so", do: 123 },
													c: {
														d: ["ba", 21, { molo: "kkkk" }],
														e: new Uint8Array([1, 2, 3, 5])
													}
												}
											});

											resolve();
										}
									});

									db.pullRemoteChanges({ continuous: true, useWebSocket });
									await db.syncClient.write(entries1);
								});
							});
						};

						testContinuousPull(true);
						testContinuousPull(false);

						it("Resolves conflicts using the default conflict handler", async () => {
							await db.put(["a", "b"], 23);
							const remoteUpdateTime = Timer.getMicrosecondTimestamp() + (1000 * 1000);

							const entries1: EntryArray<any> = [
								{ key: "['a']['b']", value: { yo: "go", do: 123 }, metadata: { updateTime: remoteUpdateTime } },
								{ key: "['a']['c']['d']", value: ["ba", 21, { molo: "kkkk" }], metadata: { updateTime: remoteUpdateTime } },
								{ key: "['a']['c']['e']", value: new Uint8Array([1, 2, 3, 4]), metadata: { updateTime: remoteUpdateTime } },
							]

							await db.syncClient.write(entries1);
							await db.pullRemoteChanges();
							expect(await db.get(["a", "b"])).toEqual(23);

							await db.resolveConflicts();
							expect(await db.get(["a", "b"])).toEqual({ yo: "go", do: 123 });
						});

						it("Resolves conflicts using the a custom conflict handler", async () => {
							await db.put(["a", "b"], 23);
							const remoteUpdateTime = Timer.getMicrosecondTimestamp() + (1000 * 1000);

							const entries1: EntryArray<any> = [
								{ key: "['a']['b']", value: { yo: "go", do: 123 }, metadata: { updateTime: remoteUpdateTime } },
								{ key: "['a']['c']['d']", value: ["ba", 21, { molo: "kkkk" }], metadata: { updateTime: remoteUpdateTime } },
								{ key: "['a']['c']['e']", value: new Uint8Array([1, 2, 3, 4]), metadata: { updateTime: remoteUpdateTime } },
							]

							await db.syncClient.write(entries1);
							await db.pullRemoteChanges();
							expect(await db.get(["a", "b"])).toEqual(23);

							await db.resolveConflicts((conflictInfo) => {
								expect(conflictInfo.path).toEqual(["a", "b"]);
								expect(conflictInfo.key).toEqual("['a']['b']");
								expect(conflictInfo.localValue).toEqual(23);
								expect(conflictInfo.remoteValue).toEqual({ yo: "go", do: 123 });
								expect(conflictInfo.remoteUpdateTime).toEqual(remoteUpdateTime);

								return Promise.resolve({ hey: 4321 });
							});

							expect(await db.get(["a", "b"])).toEqual({ hey: 4321 });
						});

						it("Discards local changes", async () => {
							await db.put(["a", "b"], 23);

							const updateTime = Timer.getMicrosecondTimestamp();

							const entries1: EntryArray<any> = [
								{ key: "['a']['b']", value: { yo: "go", do: 123 }, metadata: { updateTime } },
								{ key: "['a']['c']['d']", value: ["ba", 21, { molo: "kkkk" }], metadata: { updateTime } },
								{ key: "['a']['c']['e']", value: new Uint8Array([1, 2, 3, 4]), metadata: { updateTime } },
							]

							await db.syncClient.write(entries1);
							await db.pullRemoteChanges();

							expect(await db.get(["a", "b"])).toEqual(23);
							expect(await db.get([])).toEqual({
								a: {
									b: 23,
									c: {
										d: ["ba", 21, { molo: "kkkk" }],
										e: new Uint8Array([1, 2, 3, 4])
									}
								}
							});

							await db.put(["a", "c", "d"], [4, 3, 2, 1]);
							await db.discardLocalChanges(["a", "b"]);

							expect(await db.get([])).toEqual({
								a: {
									b: { yo: "go", do: 123 },
									c: {
										d: [4, 3, 2, 1],
										e: new Uint8Array([1, 2, 3, 4]),
									}
								}
							});
						});

					});
				});
			}
		});
	}
}
