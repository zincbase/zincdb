namespace ZincDB {
	describe("Encoding:", () => {
		describe("Underscore:", () => {
			const encode = Encoding.Underscore.encode;
			const decode = Encoding.Underscore.decode;

			it("Encodes and decodes a basic string", () => {
				expect(encode("https://fb.me/react-devtools")).toEqual("https_3a_2f_2ffb_2eme_2freact_2ddevtools");
				expect(decode("https_3a_2f_2ffb_2eme_2freact_2ddevtools")).toEqual("https://fb.me/react-devtools");
			});

			it("Encodes and decodes the empty string to an empty string", () => {
				expect(encode("")).toEqual("");
				expect(decode("")).toEqual("");
			});

			it("Escapes an underscore to a double underscore", () => {
				expect(encode("_")).toEqual("__");
				expect(decode("__")).toEqual("_");

				expect(encode("Hello_World")).toEqual("Hello__World");
				expect(decode("Hello__World")).toEqual("Hello_World");
			});

			it("Encodes and decodes random UTF-16 strings of varying lengths", () => {
				const rand = new SeededRandom();

				for (let i = 0; i < 100; i++) {
					const randomString = rand.getUTF16String(i);
					const encodedString = encode(randomString);
					expect(/^[A-Za-z0-9_]*$/.test(encodedString)).toEqual(true);
					expect(decode(encodedString)).toEqual(randomString);
				}
			});
		});
	});
}
