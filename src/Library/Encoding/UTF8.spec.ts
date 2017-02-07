namespace ZincDB {
	describe("Encoding:", () => {
		describe("UTF8:", () => {
			if (runningInNodeJS()) {
				it("Encodes and decodes random UTF8 strings using a JS implementation and produces same output as node", () => {
					const rand = new SeededRandom();

					for (let len = 0; len < 100; len++) {
						for (let i = 0; i < 10; i++) {
							const randomUTF16String = rand.getUTF16String(len);

							const nodeEncoding = new Buffer(randomUTF16String, "utf8");

							const jsEncoding = Encoding.UTF8.encodeWithJS(randomUTF16String);
							const libraryEncoding = Encoding.UTF8.encode(randomUTF16String);

							expect(jsEncoding).toEqual(nodeEncoding);
							expect(libraryEncoding).toEqual(nodeEncoding);

							expect(Encoding.UTF8.decodeWithJS(libraryEncoding)).toEqual(randomUTF16String);
							expect(Encoding.UTF8.decode(libraryEncoding)).toEqual(randomUTF16String);
						}
					}
				});
			}

			it("Encodes and decodes random UTF8 strings using automatically chosen implementation and produces same output as JS", () => {
				const rand = new SeededRandom();

				for (let len = 0; len < 100; len++) {
					for (let i = 0; i < 10; i++) {
						const randomUTF16String = rand.getUTF16String(len);

						const jsEncoding = Encoding.UTF8.encodeWithJS(randomUTF16String);
						const libraryEncoding = Encoding.UTF8.encode(randomUTF16String);

						expect(jsEncoding).toEqual(libraryEncoding);

						expect(Encoding.UTF8.decodeWithJS(libraryEncoding)).toEqual(randomUTF16String);
						expect(Encoding.UTF8.decode(libraryEncoding)).toEqual(randomUTF16String);
					}
				}
			});
		});
	});
}
