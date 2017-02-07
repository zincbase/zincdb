namespace ZincDB {
	describe("Encoding:", () => {
		describe("CodePoint:", () => {
			it("Encodes and decodes a series of random codepoints", () => {
				const rand = new SeededRandom();

				for (let i = 0; i < 10000; i++) {
					const randomCodePoint = rand.getCodePoint();
					const str = Encoding.CodePoint.decodeToString(randomCodePoint);
					expect(str.length).toBeGreaterThan(0);
					expect(str.length).toBeLessThan(3);

					expect(Encoding.CodePoint.encodeFromString(str, 0)).toEqual(randomCodePoint);
				}
			});
		});
	});
}
