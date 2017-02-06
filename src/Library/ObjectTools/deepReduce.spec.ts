namespace ZincDB {
	export namespace ObjectTools {
		const numberTypeReducer = (val: any, result: number[]) => {
			if (typeof val === "number")
				return result.concat(val);
			else
				return result;
		}

		describe("deepReduce:", () => {
			it("Allows getting a list of all numbers from a nested object", () => {
				const obj = {
					a: [1, 2, 33, { b: 4, c: ["hi", 5, 6] }],
					d: [34, [45]],
				}

				const result = deepReduce(obj, numberTypeReducer, []);

				expect(result).toEqual([1, 2, 33, 4, 5, 6, 34, 45]);
			});

			it("Detects a simple cycle an errors on it", () => {
				const x: any = { a: 1, b: null };
				x.b = x;

				expect(() => deepReduce(x, numberTypeReducer, [])).toThrow();
			});

			it("Detects a complex cycle and errors on it", () => {
				const x: any = { a: [1, 2, 3, { c: null }] };
				const y: any = { b: { z: { k: "hi", b: [55, 66, 77] }, v: [{}, { u: ["hey", "yo", null] } ] } };

				x.a[3].c = y;
				y.b.v[1].u[2] = x;

				expect(() => deepReduce(x, numberTypeReducer, [])).toThrow();
				expect(() => deepReduce(y, numberTypeReducer, [])).toThrow();
			});			
		});
	}
}