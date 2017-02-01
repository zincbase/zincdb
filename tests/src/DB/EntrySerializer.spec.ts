namespace ZincDB {
	export namespace DB {
		describe("DB:", () => {
			describe("EntrySerializer:", () => {
				describe("Header serialization:", () => {
					it("Serializes and deserializes a header correctly", () => {
						const testHeader: EntryHeader =
							{
								totalSize: 2374682736482,
								updateTime: 54561689616384,
								commitTime: 24522359616543,
								keySize: 12537,
								keyEncoding: 93,
								valueEncoding: 113,
								encryptionMethod: 75,
								flags: 68,
								secondaryHeaderSize: 34958,
								primaryHeaderChecksum: 289645328,
								payloadChecksum: 1833682315,
							}

						const serializedHeader = EntrySerializer.serializeHeader(testHeader);
						const deserializedHeader = EntrySerializer.deserializeHeader(serializedHeader);

						expect(deserializedHeader).toEqual(testHeader);
					});

					it("Serializes and deserializes random headers correctly", () => {
						for (let i = 0; i < 1000; i++) {
							const randomHeader: EntryHeader =
								{
									totalSize: JSRandom.getIntegerInRange(0, 2 ** 53),
									updateTime: JSRandom.getIntegerInRange(0, 2 ** 53),
									commitTime: JSRandom.getIntegerInRange(0, 2 ** 53),
									keySize: JSRandom.getIntegerInRange(0, 2 ** 16),
									keyEncoding: JSRandom.getIntegerInRange(0, 2 ** 8),
									valueEncoding: JSRandom.getIntegerInRange(0, 2 ** 8),
									encryptionMethod: JSRandom.getIntegerInRange(0, 2 ** 8),
									flags: JSRandom.getIntegerInRange(0, 2 ** 8),
									secondaryHeaderSize: JSRandom.getIntegerInRange(0, 2 ** 16),
									primaryHeaderChecksum: JSRandom.getIntegerInRange(0, 2 ** 32),
									payloadChecksum: JSRandom.getIntegerInRange(0, 2 ** 32),									
								}

							const serializedHeader = EntrySerializer.serializeHeader(randomHeader);
							const deserializedHeader = EntrySerializer.deserializeHeader(serializedHeader);

							expect(deserializedHeader).toEqual(randomHeader);
						}
					});
				});

				function runEntrySerializationTests(encryptionKey?: string) {

					describe(`Entry serialization (encrypted: ${encryptionKey !== undefined}):`, () => {
						it("Serializes and deserializes an entry correctly", () => {
							const entry: Entry<any> = {
								key: "你好世界",
								value: { "你好世界!!!": "Hello World! 你好世界!", num: 42 },

								metadata: {
									updateTime: 5456168961684,
								}
							}

							const serializedEntry = EntrySerializer.serializeEntry(entry, encryptionKey);
							const deserializedEntry = EntrySerializer.deserializeFirstEntry(serializedEntry, encryptionKey);

							expect(deserializedEntry).toEqual(entry);
						});

						it("Serializes and deserializes an entry with no value correctly", () => {
							const entry: Entry<any> = {
								key: "你好世界",
								value: undefined,

								metadata: {
									updateTime: 5456168961684,
								}
							}

							const serializedEntry = EntrySerializer.serializeEntry(entry, encryptionKey);
							const deserializedEntry = EntrySerializer.deserializeFirstEntry(serializedEntry, encryptionKey);

							expect(deserializedEntry).toEqual(entry);
						});

						it("Serializes and deserializes random entries correctly", () => {
							for (let i = 0; i < 1000; i++) {
								const randomEntry: Entry<any> = {
									key: JSRandom.getUTF16String(JSRandom.getIntegerInRange(1, 100)),
									value: { data: JSRandom.getUTF16String(JSRandom.getIntegerInRange(1, 100)), num: JSRandom.getFloatInRange(-79342324, 3948593845) },

									metadata: {
										updateTime: JSRandom.getIntegerInRange(0, 2 ** 53),
									}
								}

								const serializedEntry = EntrySerializer.serializeEntry(randomEntry, encryptionKey);
								const deserializedEntry = EntrySerializer.deserializeFirstEntry(serializedEntry, encryptionKey);

								expect(deserializedEntry).toEqual(randomEntry);
							}
						});

						it("Serializes and deserializes multiple random entries correctly", () => {
							for (let i = 0; i < 100; i++) {
								const randomEntries: Entry<any>[] = [];
								const randomEntriesMetadata: EntryMetadata[] = [];
								const entryCount = JSRandom.getIntegerInRange(0, 10);

								for (let i = 0; i < entryCount; i++) {
									randomEntries.push({
										key: JSRandom.getUTF16String(JSRandom.getIntegerInRange(1, 100)),
										value: { data: JSRandom.getUTF16String(JSRandom.getIntegerInRange(1, 100)), num: JSRandom.getFloatInRange(-79342324, 3948593845) },
										metadata: {
											updateTime: JSRandom.getIntegerInRange(0, 2 ** 53),
										}
									});

									randomEntriesMetadata.push({
										updateTime: JSRandom.getIntegerInRange(0, 2 ** 53),
									});
								}

								const serializedEntries = EntrySerializer.serializeEntries(randomEntries, encryptionKey);
								const deserializedEntries = EntrySerializer.deserializeEntries(serializedEntries, encryptionKey);

								expect(deserializedEntries).toEqual(randomEntries);
							}
						});

						it("Serializes, compacts and deserializes multiple entries correctly", () => {
							const entries: Entry<any>[] = [
								{ key: "你好世界3", value: { "你好世界!!!": "Hello World! 你好世界!", num: 41 }, metadata: { updateTime: 1 } },
								{ key: "你好世界2", value: { "你好世界!!!": "Hello World! 你好世界!", num: 42 }, metadata: { updateTime: 2 } },
								{ key: "你好世界1", value: { "你好世界!!!": "Hello World! 你好世界!", num: 43 }, metadata: { updateTime: 3 } },
								{ key: "你好世界1", value: { "你好世界!!!": "Hello World! 你好世界!", num: 44 }, metadata: { updateTime: 4 } },
								{ key: "你好世界2", value: { "你好世界!!!": "Hello World! 你好世界!", num: 45 }, metadata: { updateTime: 5 } },
								{ key: "你好世界3", value: { "你好世界!!!": "Hello World! 你好世界!", num: 46 }, metadata: { updateTime: 6 } },
								{ key: "你好世界3", value: { "你好世界!!!": "Hello World! 你好世界!", num: 47 }, metadata: { updateTime: 7 } },
								{ key: "你好世界4", value: { "你好世界!!!": "Hello World! 你好世界!", num: 48 }, metadata: { updateTime: 8 } },
								{ key: "你好世界1", value: { "你好世界!!!": "Hello World! 你好世界!", num: 49 }, metadata: { updateTime: 9 } },
							];

							const expectedCompactedEntries: Entry<any>[] = [
								{ key: "你好世界2", value: { "你好世界!!!": "Hello World! 你好世界!", num: 45 }, metadata: { updateTime: 5 } },
								{ key: "你好世界3", value: { "你好世界!!!": "Hello World! 你好世界!", num: 47 }, metadata: { updateTime: 7 } },
								{ key: "你好世界4", value: { "你好世界!!!": "Hello World! 你好世界!", num: 48 }, metadata: { updateTime: 8 } },
								{ key: "你好世界1", value: { "你好世界!!!": "Hello World! 你好世界!", num: 49 }, metadata: { updateTime: 9 } },
							];

							const serializedEntries = EntrySerializer.serializeEntries(entries, encryptionKey);
							const deserializedEntries = EntrySerializer.compactAndDeserializeEntries(serializedEntries, encryptionKey);

							expect(deserializedEntries).toEqual(expectedCompactedEntries);
						});

						it("Serializes and deserializes entries including binary values", () => {
							const entries: Entry<any>[] = [{
								key: "你好世界",
								value: Crypto.Random.getBytes(100),
								metadata: {
									updateTime: 5456168961684,
								}
							},
							{
								key: "你好世界2",
								value: Crypto.Random.getBytes(100),
								metadata: {
									updateTime: 2346168961685,
								}
							}];

							const serializedEntries = EntrySerializer.serializeEntries(entries, encryptionKey);
							const deserializedEntries = EntrySerializer.deserializeEntries(serializedEntries, encryptionKey);

							expect(deserializedEntries).toEqual(entries);
						});

						it("Android <= 4.3 test matcher bug test", () => {
							const a = new Uint8Array([2, 3]);
							const b = new Uint8Array([2, 3]);
							const c = new Uint8Array([1, 2, 3]);

							expect(b).toEqual(a); // Works
							expect(c.subarray(1)).toEqual(a); // Fails on Android browser <= 4.3
						});
					});
				}

				runEntrySerializationTests(undefined);
				runEntrySerializationTests("4d2d3fb0356cf6a66617e6454641697b");
			});
		});
	}
}
