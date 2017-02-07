namespace ZincDB {
	describe("Encoding:", () => {
		describe("Base64:", () => {
			it("Encodes and decodes a basic sequence to base 64 (case 1)", () => {
				const data = new Uint8Array([243, 121, 5, 57, 175, 27, 142, 3, 239, 212]);
				let base64 = Encoding.Base64.encodeWithJS(data);
				expect(base64).toEqual("83kFOa8bjgPv1A==");
				expect(ArrayTools.compareArraysAndLog(Encoding.Base64.decodeWithJS(base64), data)).toBe(true);

				base64 = Encoding.Base64.encodeWithJS(data, false);
				expect(base64).toEqual("83kFOa8bjgPv1A");
				expect(ArrayTools.compareArraysAndLog(Encoding.Base64.decodeWithJS(base64), data)).toBe(true);
			});

			it("Encodes and decodes a basic sequence to base 64 (case 2)", () => {
				const data = new Uint8Array([145, 153, 99, 66, 151, 39, 228, 211, 88, 167, 15]);
				let base64 = Encoding.Base64.encodeWithJS(data);
				expect(base64).toEqual("kZljQpcn5NNYpw8=");
				expect(ArrayTools.compareArraysAndLog(Encoding.Base64.decodeWithJS(base64), data)).toBe(true);

				base64 = Encoding.Base64.encodeWithJS(data, false);
				expect(base64).toEqual("kZljQpcn5NNYpw8");
				expect(ArrayTools.compareArraysAndLog(Encoding.Base64.decodeWithJS(base64), data)).toBe(true);
			});

			if (runningInNodeJS()) {
				it("Produces output equivalent to node.js library", () => {
					for (let len = 0; len < 100; len++) {
						for (let i = 0; i < 5; i++) {
							const randomBytes = Crypto.Random.getBytes(len);
							expect(Encoding.Base64.encodeWithJS(randomBytes)).toEqual((new Buffer(randomBytes)).toString("base64"));
						}
					}
				});
			}
		});
	});
}
