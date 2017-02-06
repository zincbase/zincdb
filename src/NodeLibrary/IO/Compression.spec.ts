namespace ZincDB {
	if (runningInNodeJS()) {
		describe("Compression:", () => {
			let testData = "";

			beforeEach(() => {
				for (let i = 0; i < 1000; i++)
					testData += "12345";
			});

			it("Compresses and decompresses", () => {
				let compressedData: NodeBuffer;

				return Compression.compressAsync(testData, undefined, "gzip")
					.then((result: NodeBuffer) => {
						expect(result).not.toBeNull();
						expect(result).toBeDefined();
						expect(result.length < testData.length / 2);
						compressedData = result;

						return Compression.decompressAsync(result);
					})
					.then((result: NodeBuffer) => {
						expect(result.toString("utf8")).toEqual(testData);
					})
			});
		});
	}
}