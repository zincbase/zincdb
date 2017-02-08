namespace ZincDB {
	describe("Scheduling:", () => {
		describe("Timer:", () => {
			it("Returns a time within 100ms of current system time", () => {
				const time = Timer.getTimestamp();
				expect(time).toBeGreaterThan(Date.now() - 100);
				expect(time).toBeLessThan(Date.now() + 100);
			});

			it("Returns a microsecond timestamp within 100ms of current system time", () => {
				const microsecondTime = Timer.getMicrosecondTimestamp();

				expect(microsecondTime / 1000).toBeGreaterThan(Date.now() - 100);
				expect(microsecondTime / 1000).toBeLessThan(Date.now() + 100);
			});
		});
	});
}
