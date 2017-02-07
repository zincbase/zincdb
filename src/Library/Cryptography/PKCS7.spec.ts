namespace ZincDB {
	describe("Crypto:", () => {
		describe("PKCS #7:", () => {
			const pad = Crypto.PKCS7.pad;
			const unpad = Crypto.PKCS7.unpad;
			const byteArray = (values: number[]) => new Uint8Array(values);

			it("Correctly pads a set of test inputs", () => {
				expect(pad(byteArray([]), 5)).toEqual(byteArray([5, 5, 5, 5, 5]));
				expect(pad(byteArray([111]), 5)).toEqual(byteArray([111, 4, 4, 4, 4]));
				expect(pad(byteArray([111, 112]), 5)).toEqual(byteArray([111, 112, 3, 3, 3]));
				expect(pad(byteArray([111, 112, 113]), 5)).toEqual(byteArray([111, 112, 113, 2, 2]));
				expect(pad(byteArray([111, 112, 113, 114]), 5)).toEqual(byteArray([111, 112, 113, 114, 1]));
				expect(pad(byteArray([111, 112, 113, 114, 115]), 5)).toEqual(byteArray([111, 112, 113, 114, 115, 5, 5, 5, 5, 5]));
				expect(pad(byteArray([111, 112, 113, 114, 115, 116]), 5)).toEqual(byteArray([111, 112, 113, 114, 115, 116, 4, 4, 4, 4]));
			});

			it("Correctly adds and removes padding to random inputs in various lengths, and various pad lengths", () => {
				for (let i = 0; i < 100; i++) {
					for (let padLength = 1; padLength <= 32; padLength++) {
						const randomInput = Crypto.Random.getBytes(i);

						expect(unpad(pad(randomInput, padLength), padLength)).toEqual(randomInput)
					}
				}
			});
		});
	});
}
