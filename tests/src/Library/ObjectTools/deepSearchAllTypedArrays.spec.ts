namespace ZincDB {
	export namespace ObjectTools {
		describe("deepSearchAllTypedArrays:", () => {
			it("Allows getting a list of all typed arrays in a nested object", () => {
				const obj = {
					a: [1, 2, "yo", new Int8Array([45, -67]), { b: new Uint16Array([34534, 3242, 56464]), c: ["hi", 5, 6] }],
					d: [34, [45, new Int32Array([423423, 54334, -34534])]],
				}

				expect(deepSearchAllTypedArrays(obj)).toEqual([new Int8Array([45, -67]), new Uint16Array([34534, 3242, 56464]), new Int32Array([423423, 54334, -34534])]);
			});
		});
	}
}