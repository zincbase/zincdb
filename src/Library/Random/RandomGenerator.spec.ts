namespace ZincDB {
	describe("Base:", () => {
		function testGenerator(newRand: () => RandomGenerator, name: string) {
			describe(`RandomGenerator '${name}':`, () => {
				it("Generates random floats in the range [0.0, 1.0)", () => {
					const rand = newRand();

					for (let i = 0; i < 1000; i++) {
						const randFloat = rand.getFloat();
						expect(randFloat >= 0 && randFloat < 1).toBe(true, "Number is not between 0 and 1");
					}
				});

				it("Generates random integers in a given range", () => {
					const rand = newRand();

					const testRange = function(min: number, max: number) {
						for (let i = 0; i < 1000; i++) {
							const randInt = rand.getIntegerInRange(min, max)
							expect(randInt >= min && randInt < max).toBe(true, `Expected ${randInt} to be in the range ${min} to ${max}`);
						}
					}

					testRange(0, 10);
					testRange(-1, 1);
					testRange(-100, -50);
					testRange(50, 100);
					testRange(1000000, 1000001);
					testRange(1000000, 1000002);
					testRange(-1000010, -1000000);
				});

				it("Generates random floats in a given range", () => {
					const rand = newRand();

					const testRange = function (min: number, max: number) {
						for (let i = 0; i < 1000; i++) {
							const randInt = rand.getFloatInRange(min, max)
							expect(randInt >= min && randInt < max).toBe(true, `Expected ${randInt} to be in the range ${min} to ${max}`);
						}
					}

					testRange(0.1111, 0.2222);
					testRange(-1.123, 1.123);
					testRange(-100.4444, -50.1111);
					testRange(50.4321, 50.5432);
				});

				it("Generates random bytes averaging to 127.5", () => {
					const byteCount = 10000;
					const rand = newRand();

					const randBytes = rand.getBytes(byteCount);
					expect(randBytes.length).toEqual(byteCount);

					let sum = 0;

					for (let i = 0; i < byteCount; i++) {
						sum += randBytes[i];
					}

					const meanValue = sum / byteCount;
					//console.log(meanValue);
					expect(meanValue).toBeGreaterThan(127.5 - 4);
					expect(meanValue).toBeLessThan(127.5 + 4);
				});
			});
		}

		testGenerator(() => new JSRandom(), "JSRandom");
		testGenerator(() => new SeededRandom(), "SeededRandom");
	});
}

