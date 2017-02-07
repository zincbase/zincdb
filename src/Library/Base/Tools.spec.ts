namespace ZincDB {
	describe("Tools:", () => {
		describe("integerToBase10AsciiStringBytes:", () => {
			it("Correctly converts the integers between 0..1000", () => {
				for (let i = 0; i < 1000; i++) {
					const result = Tools.integerToBase10AsciiStringBytes(i);
					const expectedResult = Encoding.UTF8.encode(i.toString());

					expect(result).toEqual(expectedResult);
				}
			});

			it("Correctly converts the largest integers possible in Javascript (in the range of 2^53)", () => {
				const rand = new SeededRandom();

				for (let i = 0; i < 100; i++) {
					const randomInt = rand.getIntegerInRange(9007199254740992 - 1000, 9007199254740992);

					const result = Tools.integerToBase10AsciiStringBytes(randomInt);
					const expectedResult = Encoding.UTF8.encode(randomInt.toString());

					expect(result).toEqual(expectedResult);
				}
			});

			it("Correctly converts random integers between 0..9007199254740992", () => {
				const rand = new SeededRandom();

				for (let i = 0; i < 1000; i++) {
					const randomInt = rand.getIntegerInRange(0, 9007199254740992);

					const result = Tools.integerToBase10AsciiStringBytes(randomInt);
					const expectedResult = Encoding.UTF8.encode(randomInt.toString());

					expect(result).toEqual(expectedResult);
				}
			});
		});

	});
}
