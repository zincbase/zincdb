namespace ZincDB {
	export namespace ObjectTools {
		describe("deepCloneObject:", () => {
			it("Clones simple objects", () => {
				const testCases = [
					12,
					"hi",
					["a", "b", 3],
					{ a: "hi", b: 12 },
					{ a: [5, 4, 3], b: { yo: true } },
					{ a: [5, 4, { x: "vvv" }], b: { yo: true, go: [[1, 2, 3], [3, 2, 1]] } }
				];

				for (const testCase of testCases) {
					expect(deepClone(testCase)).toEqual(testCase);
				}
			});

			it("Clones objects containing typed arrays", () => {
				const testCases = [
					[new Int8Array([1, -2, 3]), new Uint8Array([1, 2, 3])],
					[new Int16Array([1111, -2222, 3333]), new Uint16Array([1111, 2222, 3333])],
					{ a: new Int32Array([-1111111, -2222222, 3333333]), b: new Uint32Array([1111111, 2222222, 3333333]) },
					{ c: new Float32Array([-1111111.111, -2222222.222, 3333333.333]), d: [new Float64Array([-1111111.111 * 10000, -1111111.111 * 10000, 3333333.333 * 10000])] },
				];

				for (const testCase of testCases) {
					expect(deepClone(testCase)).toEqual(testCase);
				}
			});

			it("Clones objects containing ArrayBuffer objects", () => {
				const a = new Uint8Array([1, 2, 3]);
				const buf: ArrayBuffer = a.buffer;
				expect(new Uint8Array(deepClone(buf))).toEqual(a);
			});

			it("Clones objects containing dates and regular expressions", () => {
				const testCases = [
					[new Date(), { x: /^gogo$/g }],
					{ yo: { go: /^dadada(da)?$/gi }, jo: [new Date(), new Date(345345), 3, 4] }
				];

				for (const testCase of testCases) {
					expect(deepClone(testCase)).toEqual(testCase);
				}
			});

			it("Detects a simple cycle an errors on it", () => {
				var x: any = { a: null };
				x.a = x;
				expect(() => deepClone(x)).toThrow();
			});
			
			it("Detects a complex cycle and errors on it", () => {
				var x: any = { a: [1, 2, 3, { c: null }] };
				var y: any = { b: { z: { k: "hi", b: [55, 66, 77] }, v: [{}, { u: ["hey", "yo", null] } ] } };

				x.a[3].c = y;
				y.b.v[1].u[2] = x;

				expect(() => deepClone(x)).toThrow();
				expect(() => deepClone(y)).toThrow();
			});
		});
	}
}