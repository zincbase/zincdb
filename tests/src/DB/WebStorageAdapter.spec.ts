namespace ZincDB {
	export namespace DB {
		if (WebStorageAdapter.isAvailable) {

			describe(`WebStorage adapter:`, () => {
				let dbName: string;
				let storage: WebStorageAdapter;

				beforeEach(() => {
					dbName = "webStorageAdapterTestSuite-" + JSRandom.getWordCharacterString(10);
					storage = new WebStorageAdapter(dbName, "LocalStorage");
				});

				afterEach(() => {
					storage.destroy();
				});

				it("Automatically rolls back all changes if a transaction fails because it causes local storage to exceed its quota", async () => {
					const storage = new WebStorageAdapter(dbName, "LocalStorage");
					await storage.open();

					await storage.createObjectStoresIfNeeded(["store1", "store2"]);
					await storage.set({
						"store1": {
							"key0": { key: "key0", value: "good", metadata: { updateTime: 0 } },
							"key1": { key: "key1", value: 1234, metadata: { updateTime: 1 } },
							"key2": { key: "key2", value: "hello", metadata: { updateTime: 2 } }
						},
						"store2": {
							"key3": { key: "key3", value: 4321, metadata: { updateTime: 3 } },
							"key4": { key: "key4", value: "world", metadata: { updateTime: 4 } }
						}
					});

					// Create a very long string of length 100 * 100000 = ~10MB
					let longStringComponents: string[] = []
					for (let i = 0; i < 100000; i++)
						longStringComponents.push("LongStringLongStringLongStringLongStringLongStringLongStringLongStringLongStringLongStringLongString");
					const veryLongString = longStringComponents.join("");

					// Try to execute the transaction
					try {
						await storage.set({
							"store1": {
								"key1": { key: "key1", value: 9999, metadata: { updateTime: 11 } },
								"key2": null,
							},
							"store2": {
								"key3": { key: "key3", value: 1111, metadata: { updateTime: 12 } },
								"key4": { key: "key4", value: veryLongString, metadata: { updateTime: 13 } }
							}
						});
					}
					catch (e) {
						// Possible error names: 
						// "QuotaExceededError" (IE/Edge/Chrome)
						// "NS_ERROR_DOM_QUOTA_REACHED" (Firefox)

						expect(await storage.get("key0", "store1")).toEqual({ key: "key0", value: "good", metadata: { updateTime: 0 } });
						expect(await storage.get("key1", "store1")).toEqual({ key: "key1", value: 1234, metadata: { updateTime: 1 } });
						expect(await storage.get("key2", "store1")).toEqual({ key: "key2", value: "hello", metadata: { updateTime: 2 } });
						expect(await storage.get("key3", "store2")).toEqual({ key: "key3", value: 4321, metadata: { updateTime: 3 } });
						expect(await storage.get("key4", "store2")).toEqual({ key: "key4", value: "world", metadata: { updateTime: 4 } });

						return;
					}

					expect(true).toBe(false, "Expected transaction to fail.");
				});
			});
		}
	}
}