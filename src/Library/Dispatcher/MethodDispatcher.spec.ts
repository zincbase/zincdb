namespace ZincDB {
	describe("Dispatcher:", () => {
		describe("MethodDispatcher:", () => {
			it("Executes methods contained in a given handler map", async () => {
				const handlerMap = {
					a: (num1: number, num2: number) => {
						expect(num1).toEqual(11);
						expect(num2).toEqual(22);

						return 1122;
					},
					b: (num1: number, num2: number) => {
						expect(num1).toEqual(33);
						expect(num2).toEqual(44);

						return 3344;
					}
				}

				const dispatcher = new MethodDispatcher(handlerMap);
				expect(await dispatcher.exec("", "a", [11, 22])).toEqual(1122);
				expect(await dispatcher.exec("", "b", [33, 44])).toEqual(3344);
				expect(await dispatcher.exec("", "a", [11, 22])).toEqual(1122);
				expect(await dispatcher.exec("", "b", [33, 44])).toEqual(3344);

				await expectPromiseToReject(dispatcher.exec("", "c", [33, 44]));
			});
		});
	});
}
