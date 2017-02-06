namespace ZincDB {
	describe("Encoding:", () => {
		describe("UTF8:", () => {
			if (runningInNodeJS()) {
				it("Encodes and decodes random UTF8 strings using a JS implementation and produces same output as node", () => {
					for (let i = 0; i < 100; i++) {
						const charCount = JSRandom.getIntegerInRange(0, 1000);
						const randomUTF16String = JSRandom.getUTF16String(charCount);

						const nodeEncoding = new Buffer(randomUTF16String, "utf8");
						const libraryEncoding = Encoding.UTF8.encodeWithJS(randomUTF16String);

						expect(ArrayTools.compareArraysAndLog(libraryEncoding, nodeEncoding)).toEqual(true);

						const nodeDecoding = nodeEncoding.toString("utf8");
						const libraryDecoding = Encoding.UTF8.decodeWithJS(libraryEncoding);

						expect(nodeDecoding).toEqual(libraryDecoding);
						expect(libraryDecoding).toEqual(randomUTF16String);
					}
				});
			}

			it("Encodes and decodes random UTF8 strings using automatically chosen implementation and produces same output as JS", () => {
				for (let i = 0; i < 100; i++) {
					const charCount = JSRandom.getIntegerInRange(0, 1000);
					const randomUTF16String = JSRandom.getUTF16String(charCount);

					const jsEncoding = Encoding.UTF8.encodeWithJS(randomUTF16String);
					const libraryEncoding = Encoding.UTF8.encode(randomUTF16String);

					expect(ArrayTools.compareArraysAndLog(libraryEncoding, jsEncoding)).toEqual(true);

					const jsDecoding = Encoding.UTF8.decodeWithJS(libraryEncoding);
					const libraryDecoding = Encoding.UTF8.decode(libraryEncoding);

					expect(jsDecoding).toEqual(libraryDecoding);
					expect(libraryDecoding).toEqual(randomUTF16String);
				}
			});
		});
	});
}