namespace ZincDB {
	describe("Encoding:", () => {
		describe("OmniBinary:", () => {
			const encode = Encoding.OmniBinary.encode;
			const decode = Encoding.OmniBinary.decode;

			it("Correctly encodes and decodes a string", () => {
				expect(decode(encode("Hello World!"))).toEqual("Hello World!");
			});

			it("Correctly encodes and decodes a Uint8Array", () => {
				expect(decode(encode(new Uint8Array([1, 2, 3, 4])))).toEqual(new Uint8Array([1, 2, 3, 4]));
			});

			it("Correctly encodes and decodes random objects", () => {
				const rand = new SeededRandom();

				for (let i = 0; i < 100; i++) {
					const randObject = RandomObject.generate(5, 3, rand);
					const encoded = Encoding.OmniBinary.encode(randObject);
					expect(Encoding.OmniBinary.decode(encoded)).toEqual(randObject);
				}
			});
		});
	});
}
