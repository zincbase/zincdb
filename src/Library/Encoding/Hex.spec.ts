namespace ZincDB {
	describe("Encoding:", () => {
		describe("Hex:", () => {
			it("Encodes and decodes a basic sequence to hex", () => {
				const data = new Uint8Array([34, 64, 76, 123, 211, 17]);
				const hex = Encoding.Hex.encodeWithJS(data);
				expect(hex).toEqual("22404c7bd311");
				expect(Encoding.Hex.decodeWithJS(hex)).toEqual(data);
			});

			if (runningInNodeJS()) {
				it("Produces output equivalent to node.js library", () => {
					const rand = new SeededRandom();

					for (let len = 0; len < 100; len++) {
						for (let i = 0; i < 5; i++) {
							const randomBytes = rand.getBytes(len);
							expect(Encoding.Hex.encodeWithJS(randomBytes)).toEqual((new Buffer(randomBytes)).toString("hex"));
						}
					}
				});
			}
		});
	});
}
