namespace ZincDB {
	describe("Encoding:", () => {
		describe("JsonX:", () => {
			it("For a non-undefined argument: produces output equivalent to JSON.stringify", () => {
				expect(Encoding.JsonX.encode({ a: 1234 })).toEqual(JSON.stringify({ a: 1234 }));
				expect(Encoding.JsonX.decode(Encoding.JsonX.encode({ a: 1234 }))).toEqual({ a: 1234 });
			});

			it("For an undefined argument: produces a 0 length string", () => {
				expect(Encoding.JsonX.encode(undefined)).toEqual("");
				expect(Encoding.JsonX.decode("")).toEqual(undefined);
			});
		});
	});
}
