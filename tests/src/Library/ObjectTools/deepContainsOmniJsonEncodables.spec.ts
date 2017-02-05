namespace ZincDB {
	export namespace ObjectTools {
		describe("deepContainsOmniJsonEncodables:", () => {
			it("Check if special objects encodable by OmniJson exist deeply in the object tree", () => {
				expect(deepContainsOmniJsonEncodables(undefined)).toEqual(false);
				expect(deepContainsOmniJsonEncodables(null)).toEqual(false);
				expect(deepContainsOmniJsonEncodables({})).toEqual(false);
				expect(deepContainsOmniJsonEncodables([1, "hello", true, {}])).toEqual(false);
				expect(deepContainsOmniJsonEncodables(new Uint8Array([1, 2, 3]))).toEqual(true);
				expect(deepContainsOmniJsonEncodables({ a: new Int16Array([-1, 1]) })).toEqual(true);
				expect(deepContainsOmniJsonEncodables({ c: [new Date()] })).toEqual(true);
				expect(deepContainsOmniJsonEncodables({ c: [1, 2] })).toEqual(false);
				expect(deepContainsOmniJsonEncodables([1, "hello", true, { g: /^abcd$/ }])).toEqual(true);
			});
		});
	}
}
