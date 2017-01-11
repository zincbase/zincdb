namespace ZincDB {
	describe("Encoding:", () => {
		describe("RawBinary:", () => {
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

		describe("UTF8:", () => {
			if (runningInNodeJS()) {
				it("Encodes and decodes random UTF8 strings using a JS implementation and produces same output as node", () => {
					for (let i = 0; i < 100; i++) {
						const charCount = JSRandom.getIntegerInRange(0, 1000);
						const randomUTF16String = JSRandom.getUTF16String(charCount);

						const nodeEncoding = new Buffer(randomUTF16String, "utf8");
						const libraryEncoding = Encoding.UTF8.encodeWithJS(randomUTF16String);

						expect(ArrayTools.compareArraysAndLog(libraryEncoding, nodeEncoding)).toEqual(true);

						const nodeDecoding = nodeEncoding.toString("utf8");
						const libraryDecoding = Encoding.UTF8.decodeWithJS(libraryEncoding);

						expect(nodeDecoding).toEqual(libraryDecoding);
						expect(libraryDecoding).toEqual(randomUTF16String);
					}
				});
			}

			it("Encodes and decodes random UTF8 strings using automatically chosen implementation and produces same output as JS", () => {
				for (let i = 0; i < 100; i++) {
					const charCount = JSRandom.getIntegerInRange(0, 1000);
					const randomUTF16String = JSRandom.getUTF16String(charCount);

					const jsEncoding = Encoding.UTF8.encodeWithJS(randomUTF16String);
					const libraryEncoding = Encoding.UTF8.encode(randomUTF16String);

					expect(ArrayTools.compareArraysAndLog(libraryEncoding, jsEncoding)).toEqual(true);

					const jsDecoding = Encoding.UTF8.decodeWithJS(libraryEncoding);
					const libraryDecoding = Encoding.UTF8.decode(libraryEncoding);

					expect(jsDecoding).toEqual(libraryDecoding);
					expect(libraryDecoding).toEqual(randomUTF16String);
				}
			});
		});

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
					for (let i = 0; i < 100; i++) {
						const randomBytes = JSRandom.getIntegerArray(i, 0, 256);
						expect(Encoding.Base64.encodeWithJS(new Uint8Array(randomBytes))).toEqual((new Buffer(randomBytes)).toString("base64"));
					}
				});
			}
		});
	});
}
