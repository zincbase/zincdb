namespace ZincDB {
	describe("Scheduling:", () => {
		describe("PromiseQueue:", () => {
			it("Runs several promise functions in order", (done) => {
				const numbers = [0, 1, 2, 3];
				const promiseQueue = new PromiseQueue();

				promiseQueue.add(() => PromiseX.start(() => {
					expect(promiseQueue.pendingPromiseCount === 3);

					numbers[0] = 100;
					expect(numbers).toEqual([100, 1, 2, 3]);
				}));

				promiseQueue.add(() => PromiseX.start(() => {
					expect(promiseQueue.pendingPromiseCount === 2);

					numbers[2] = 100;
					expect(numbers).toEqual([100, 1, 100, 3]);
				}));

				promiseQueue.add(() => PromiseX.start(() => {
					expect(promiseQueue.pendingPromiseCount === 1);

					numbers[3] = 100;
					expect(numbers).toEqual([100, 1, 100, 100]);
				}));

				promiseQueue.add(() => PromiseX.start(() => {
					expect(promiseQueue.pendingPromiseCount === 0);

					numbers[1] = 100;
					expect(numbers).toEqual([100, 100, 100, 100]);

					promiseQueue.add(() => PromiseX.start(() => {
						expect(promiseQueue.pendingPromiseCount === 0);
						expect(numbers).toEqual([100, 100, 100, 100]);

						done();
					}));
				}));
			});

			it("Runs several promise functions in order, and continues even when some of them are rejected", (done) => {
				const numbers = [0, 1, 2, 3];
				const promiseQueue = new PromiseQueue();

				promiseQueue.add(() => PromiseX.start(() => {
					expect(promiseQueue.pendingPromiseCount === 3);

					numbers[0] = 100;
					expect(numbers).toEqual([100, 1, 2, 3]);

					throw new Error("This error should not prevent the next promise from starting");
				}));

				promiseQueue.add(() => PromiseX.start(() => {
					expect(promiseQueue.pendingPromiseCount === 2);

					numbers[2] = 100;
					expect(numbers).toEqual([100, 1, 100, 3]);
				}));

				promiseQueue.add(() => PromiseX.start(() => {
					expect(promiseQueue.pendingPromiseCount === 1);

					numbers[3] = 100;
					expect(numbers).toEqual([100, 1, 100, 100]);

					throw new Error("This error should not prevent the next promise from starting");
				}));

				promiseQueue.add(() => PromiseX.start(() => {
					expect(promiseQueue.pendingPromiseCount === 0);

					numbers[1] = 100;
					expect(numbers).toEqual([100, 100, 100, 100]);

					done();
				}));
			});
		})
	})
}
