namespace ZincDB {
	export namespace ObjectTools {
		describe("deepCompare:", () => {
			it("Compares simple objects (positive outcome)", () => {
				const positiveTestCases = [
					[1234, 1234],
					[[1, 2, 3], [1, 2, 3]],
					[[1, 2, true, "yo"], [1, 2, true, "yo"]],
					[[1, 2, { a: "ok" }], [1, 2, { a: "ok" }]],
					[[1, 2, [{ a: "ok" }, []]], [1, 2, [{ a: "ok" }, []]]],
					[{ a: [4, 3, false], b: "yoohoo" }, { a: [4, 3, false], b: "yoohoo" }],
					[{ a: undefined }, { a: undefined }],
					[{ p: NaN }, { p: NaN }],
					[{ a: 123, b: undefined }, { a: 123 }]
				]

				for (const testCase of positiveTestCases) {
					expect(deepCompare(testCase[0], testCase[1])).toBe(true);
				}
			});

			it("Compares simple objects (negative outcome)", () => {
				const negativeTestCases = [
					[1234, 1235],
					[[1, 2, 3], [1, 2, 4]],
					[[1, 2, 3], [1, 2, 3, 4]],
					[[1, 2, { a: "ok" }], [1, 2, { a: "od" }]],
					[[1, 2, [{ a: "ok" }, []]], [1, 2, [{ a: "ok" }, {}]]],
				]

				for (const testCase of negativeTestCases) {
					expect(deepCompare(testCase[0], testCase[1])).toBe(false);
				}
			});

			it("Compares objects containing typed arrays, Date and RegExp objects (positive outcome)", () => {
				const positiveTestCases = [
					[[1, new Date(238478237)], [1, new Date(238478237)]],
					[{ a: /^gogogo$/ig }, { a: /^gogogo$/ig }],
					[{ a: new Int8Array([1, -2, 3, -4]) }, { a: new Int8Array([1, -2, 3, -4]) }],
					[{ a: new Uint8Array([1, 2, 3, 4]) }, { a: new Uint8Array([1, 2, 3, 4]) }],
					[{ a: new Int16Array([1000, -2000, 3000, -4000]) }, { a: new Int16Array([1000, -2000, 3000, -4000]) }],
					[{ a: new Uint16Array([1000, 2000, 3000, 3000]) }, { a: new Uint16Array([1000, 2000, 3000, 3000]) }],
					[{ a: new Int32Array([1000000, -2000000, 3000000, -4000000]) }, { a: new Int32Array([1000000, -2000000, 3000000, -4000000]) }],
					[{ a: new Uint32Array([1000000, 2000000, 3000000, 4000000]) }, { a: new Uint32Array([1000000, 2000000, 3000000, 4000000]) }],
					[{ a: new Float32Array([1000000.111, -2000000.222, 3000000.333, 4000000.444]) }, { a: new Float32Array([1000000.111, -2000000.222, 3000000.333, 4000000.444]) }],
					[{ a: new Float64Array([1000000.111 * 1000000, -2000000.222 * 1000000, 3000000.333 * 1000000, 4000000.444 * 1000000]) }, { a: new Float64Array([1000000.111 * 1000000, -2000000.222 * 1000000, 3000000.333 * 1000000, 4000000.444 * 1000000]) }],
					[{ a: (new Uint8Array([1, 2, 3, 4])).buffer }, { a: (new Uint8Array([1, 2, 3, 4])).buffer }],
				]

				for (const testCase of positiveTestCases) {
					expect(deepCompare(testCase[0], testCase[1])).toBe(true);
				}
			});

			it("Compares objects containing typed arrays, Date and RegExp objects (negative outcome)", () => {
				const positiveTestCases = [
					[[1, new Date(238478237)], [1, new Date(2384782375)]],
					[{ a: /^gogogo$/ig }, { a: /^gogogo$/i }],
					[{ a: /^gogogoa$/ig }, { a: /^gogogo$/i }],
					[{ a: new Int8Array([1, -2, 3, -4]) }, { a: new Int8Array([1, -2, -3, -4]) }],
					[{ a: new Uint8Array([1, 2, 3, 4]) }, { a: new Uint8Array([1, 2, 3, 4, 5]) }],
					[{ a: new Int16Array([1000, -2000, 3000, -4000]) }, { a: new Uint16Array([1000, 2000, 3000, 4000]) }],
					[{ a: new Uint16Array([1000, 2000, 3000, 3000]) }, { a: new Uint32Array([1000, 2000, 3000, 3000]) }],
					[{ a: new Int32Array([1000000, -2000000, 3000000, -4000000]) }, { a: new Uint32Array([1000000, -2000000, 3000000, -4000000]) }],
					[{ a: new Uint32Array([1000000, 2000000, 3000000, 4000000]) }, { a: new Int32Array([1000000, 2000000, 3000000, 4000000]) }],
					[{ a: new Float32Array([1000000.111, -2000000.222, 3000000.333, 4000000.444]) }, { a: new Float64Array([1000000.111, -2000000.222, 3000000.333, 4000000.444]) }],
					[{ a: new Float64Array([1000000.111 * 1000000, -2000000.222 * 1000000, 3000000.333 * 1000000, 4000000.444 * 1000000]) }, { a: new Float32Array([1000000.111 * 1000000, -2000000.222 * 1000000, 3000000.333 * 1000000, 4000000.444 * 1000000]) }],
					[{ a: (new Uint8Array([1, 2, 3, 4, 5])).buffer }, { a: (new Uint8Array([1, 2, 3, 4])).buffer }],
				]

				for (const testCase of positiveTestCases) {
					expect(deepCompare(testCase[0], testCase[1])).toBe(false);
				}
			});

			it("Detects a simple cycle and errors on it", () => {
				const x: any = { a: null };
				x.a = x;

				const y: any = { a: null };
				y.a = y;

				expect(() => deepCompare(x, y)).toThrow();
			});

			it("Detects a complex cycle and errors on it", () => {
				const x1: any = { a: [1, 2, 3, { c: null }] };
				const x2: any = { b: { z: { k: "hi", b: [55, 66, 77] }, v: [{}, { u: ["hey", "yo", null] }] } };
				x1.a[3].c = x2;
				x2.b.v[1].u[2] = x1;

				const y1: any = { a: [1, 2, 3, { c: null }] };
				const y2: any = { b: { z: { k: "hi", b: [55, 66, 77] }, v: [{}, { u: ["hey", "yo", null] }] } };
				y1.a[3].c = y2;
				y2.b.v[1].u[2] = y1;


				expect(() => deepCompare(x2, y2)).toThrow();
				expect(() => deepCompare(x1, y1)).toThrow();
			});
		});
	}
}