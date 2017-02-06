namespace ZincDB {
	export namespace ObjectTools {
		const numberTypePredicate = (val: any): boolean => {
			return typeof val === "number";
		}

		describe("deepContains:", () => {
			it("Allows checking a nested object if a value exists that satisfies a given predicate", () => {
				expect(deepContains(["a", "b", { yo: [true, false, "aaa", ["c", 1]] }], numberTypePredicate)).toBe(true);
				expect(deepContains(["a", "b", { yo: [true, false, "aaa", ["c", false]] }], numberTypePredicate)).toBe(false);
				expect(deepContains(123, numberTypePredicate)).toBe(true);
				expect(deepContains("abc", numberTypePredicate)).toBe(false);
				expect(deepContains(null, numberTypePredicate)).toBe(false);
				expect(deepContains(undefined, numberTypePredicate)).toBe(false);
				expect(deepContains({}, numberTypePredicate)).toBe(false);
			});

			it("Detects a simple cycle an errors on it", () => {
				const x: any = { a: "hi", b: null };
				x.b = x;

				expect(() => deepContains(x, numberTypePredicate)).toThrow();
			});

			it("Detects a complex cycle and errors on it", () => {
				const x: any = ["a", "b", { yo: [true, null, "aaa", ["c"]] }]
				const y: any = { u: { v: ["a", "b", null] } }

				x[2].yo[1] = y;
				y.u.v[2] = x;

				expect(() => deepContains(x, numberTypePredicate)).toThrow();
				expect(() => deepContains(y, numberTypePredicate)).toThrow();
			});
		});
	}
}
