namespace ZincDB {
	describe("Dispatcher:", () => {
		describe("TokenizedDispatcher:", () => {
			it("Executes handler when exec is called and passes correct arguments", async () => {
				const dispatcher = new TokenizedDispatcher((request, options) => {
					expect(request.token).toBeDefined();
					expect(request.target).toEqual("target");
					expect(request.operation).toEqual("hi");
					expect(request.args).toEqual([1, 2, 3]);

					dispatcher.announceResponse({
						token: request.token,
						target: request.target,
						operation: request.operation,
						result: 1234
					});
				});

				expect(await dispatcher.exec("target", "hi", [1, 2, 3])).toEqual(1234);
				expect(await dispatcher.exec("target", "hi", [1, 2, 3])).toEqual(1234);
			});
		});
	});
}
