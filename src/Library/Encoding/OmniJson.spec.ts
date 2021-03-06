namespace ZincDB {
	describe("Encoding:", () => {
		describe("OmniJson:", () => {
			it("Encodes and decodes a regular JSON object", () => {
				const test = { "Hi there": 342, hello: ["a b c d", "a", true, 2342], d: { bbbb: "sssss" } };
				const encodedTest = Encoding.OmniJson.encode(test);
				expect(Encoding.OmniJson.decode(encodedTest)).toEqual(test);
			});

			it("Encodes and decodes a JSON object containing Uint8Arrays", () => {
				const test = { "Hi there": 342, zzz: new Uint8Array([]), hello: ["a b c d", "a", true, 2342, new Uint8Array([4, 3, 2, 1])], d: { bbbb: "sssss", dddd: new Uint8Array([255, 35, 99, 104]) } };
				const encodedTest = Encoding.OmniJson.encode(test);
				expect(Encoding.OmniJson.decode(encodedTest)).toEqual(test);
			});

			it("Encodes and decodes a JSON object containing various kinds of special objects", () => {
				const test = {
					"Hi there": 342,
					zzz: new Int16Array([]),
					hello: ["a b c d", "a", true, new Int32Array([238573, 456456, -456456542342]), new Uint8Array([4, 3, 2, 1])],
					d: { bbbb: "sssss", dddd: new Int8Array([255, -254, 99, 104]) },
					v: { a: { t: new Float32Array([-234234.23423, 1000000.543]) } },
					"v 3 235": { a: { t: new Float64Array([-23423453454334.2333, 23423453454334.543]) } },
					"asd 35": { a: { t: [new Uint16Array([53433, 4234])] }, b: new Date() },
					"sss": { x: [new Uint32Array([5555, 6666, 7777]).buffer] },
					bbb: [/abcd/, /^([01][0-9][0-9]|2[0-4][0-9]|25[0-5])$/gi, "acdc"]
				};

				const encodedTest = Encoding.OmniJson.encode(test);
				const decodedResult = Encoding.OmniJson.decode(encodedTest);
				expect(decodedResult).toEqual(test);
			});

			it("Encodes and decodes a typed array", () => {
				const test = new Int16Array([-4453, 47567, 45]);
				const encodedTest = Encoding.OmniJson.encode(test);
				const decodedResult = Encoding.OmniJson.decode(encodedTest);
				expect(decodedResult).toEqual(test);
			});

			it("Encodes and decodes a series of random object trees", () => {
				const rand = new SeededRandom();

				for (let i = 0; i < 1000; i++) {
					const randObject = RandomObject.generate(10, 3, rand);

					const encoded = Encoding.OmniJson.encode(randObject);
					const decoded = Encoding.OmniJson.decode(encoded);

					expect(decoded).toEqual(randObject);
				}
			});
		});
	});
}
