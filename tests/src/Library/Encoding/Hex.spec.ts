namespace ZincDB {
	describe("Encoding:", () => {
		describe("Hex:", () => {
			it("Encodes and decodes a basic sequence to hex", () => {
				const data = [34, 64, 76, 123, 211, 17];
				const hex = Encoding.Hex.encodeWithJS(new Uint8Array(data));
				expect(hex).toEqual("22404c7bd311");
				expect(ArrayTools.compareArraysAndLog(Encoding.Hex.decodeWithJS(hex), data)).toBe(true);
			});

			if (runningInNodeJS()) {
				it("Produces output equivalent to node.js library", () => {
					for (let i = 0; i < 100; i++) {
						const randomBytes = JSRandom.getIntegerArray(i, 0, 256);
						expect(Encoding.Hex.encodeWithJS(new Uint8Array(randomBytes))).toEqual((new Buffer(randomBytes)).toString("hex"));
					}
				});
			}
		});
	});
}