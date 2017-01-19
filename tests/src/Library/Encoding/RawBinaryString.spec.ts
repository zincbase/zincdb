namespace ZincDB {
	describe("Encoding:", () => {
		describe("RawBinaryString:", () => {
			if (runningInNodeJS()) {
				it("Encodes and decodes raw binary strings", () => {
					const charCount = 1000;
					const randomBytes = new Buffer(JSRandom.getIntegerArray(charCount, 0, 256));

					const nodeDecoding = randomBytes.toString("binary");
					const libraryDecoding = Encoding.RawBinaryString.decodeWithJS(new Uint8Array(randomBytes));

					expect(libraryDecoding).toEqual(nodeDecoding);

					const nodeEncoding = new Buffer(libraryDecoding, "binary")
					const libraryEncoding = Encoding.RawBinaryString.encodeWithJS(libraryDecoding);

					expect(ArrayTools.compareArraysAndLog(libraryEncoding, randomBytes)).toEqual(true);
					expect(ArrayTools.compareArraysAndLog(nodeEncoding, libraryEncoding)).toEqual(true);
				});
			}
		});
	});
}