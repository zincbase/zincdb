namespace ZincDB {
	export namespace ObjectTools {
		describe("deepSearchAllTransferableObjects:", () => {
			it("Returns a list of all underlying ArrayBuffers used in a nested object", () => {

				const obj = {
					a: [1, 2, "yo", new Int8Array([45, -67]), { b: new Uint16Array([34534, 3242, 56464]), c: ["hi", 5, 6] }],
					d: [34, [45, new Int32Array([423423, 54334, -34534])]],
				}

				const results = deepSearchTransferableObjects(obj);

				expect (results[0] instanceof ArrayBuffer);
				expect (new Int8Array(results[0])).toEqual(new Int8Array([45, -67]));
				expect (results[1] instanceof ArrayBuffer);
				expect (new Uint16Array(results[1])).toEqual(new Uint16Array([34534, 3242, 56464]));
				expect (results[2] instanceof ArrayBuffer);
				expect (new Int32Array(results[2])).toEqual((new Int32Array([423423, 54334, -34534])));
			});

			it("Returns an empty array when given undefined", () => {
				expect(deepSearchTransferableObjects(undefined)).toEqual([]);
			});			
		});
	}
}