namespace ZincDB {
	describe("Encoding:", () => {
		describe("RegExpString:", () => {
			it("Encodes and decodes a regular expression without flags to a string", () => {
				const regexp = /^([01][0-9][0-9]|2[0-4][0-9]|25[0-5])$/
				const encodedRegExp = Encoding.RegExpString.encode(regexp);
				const decodedRegExp = Encoding.RegExpString.decode(encodedRegExp);
				expect(decodedRegExp).toEqual(regexp);
			});				
			it("Encodes and decodes a regular expression with flags to a string", () => {
				const regexp = /^([01][0-9][0-9]|2[0-4][0-9]|25[0-5])$/gi
				const encodedRegExp = Encoding.RegExpString.encode(regexp);
				const decodedRegExp = Encoding.RegExpString.decode(encodedRegExp);
				expect(decodedRegExp).toEqual(regexp);
			});
		});
	});
}