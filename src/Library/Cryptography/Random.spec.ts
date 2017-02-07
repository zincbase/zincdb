namespace ZincDB {
	describe("Crypto:", () => {
		describe("Random:", () => {
			it("Produces a correct number of bytes", () => {
				for (let i = 0; i < 100; i++) {
					const randomBytes = Crypto.Random.getBytes(i);

					expect(randomBytes instanceof Uint8Array).toBe(true);
					expect(randomBytes).not.toBeNull();
					expect(randomBytes).not.toBeUndefined();
					expect(randomBytes.length).toEqual(i);
				}
			});

			it("Produces values cummulatively averaging around 127.5", () => {
				const byteCount = 10000;
				const randomBytes = Crypto.Random.getBytes(byteCount);

				let sum = 0;

				for (let i = 0; i < byteCount; i++) {
					sum += randomBytes[i];
				}

				const meanValue = sum / byteCount;
				//console.log(meanValue);
				expect(meanValue).toBeGreaterThan(127.5 - 4);
				expect(meanValue).toBeLessThan(127.5 + 4);
			});

			it("Produces a string with a correct number of string characters", () => {
				for (let i = 0; i < 100; i++) {
					const randomString = Crypto.Random.getAlphanumericString(i);

					expect(typeof randomString).toEqual("string");
					expect(randomString).not.toBeNull();
					expect(randomString).not.toBeUndefined();
					expect(randomString.length).toEqual(i);
					expect(/^[A-Za-z0-9]*$/.test(randomString)).toBe(true);
				}
			});

			it("Produces a Uint32", () => {
				const randomUint32 = Crypto.Random.getUint32();

				expect(typeof randomUint32).toBe("number");
				expect(randomUint32).not.toBeNull();
				expect(randomUint32).not.toBeUndefined();
			});

			it("Produces an Int32", () => {
				const randomInt32 = Crypto.Random.getInt32();

				expect(typeof randomInt32).toBe("number");
				expect(randomInt32).not.toBeNull();
				expect(randomInt32).not.toBeUndefined();
			});

			it("Returns a large amount (1MB) of random data", () => {
				const randomBytes = Crypto.Random.getBytes(1000000);

				expect(randomBytes).not.toBeNull();
				expect(randomBytes).not.toBeUndefined();
				expect(randomBytes.length).toEqual(1000000);
			});
		});
	});
}
