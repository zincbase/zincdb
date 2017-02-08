namespace ZincDB {
	export namespace Encoding {
		describe("Encoding:", () => {
			describe("BigEndian:", () => {
				it("Converts to and from int array", () => {
					const rand = new SeededRandom();

					for (let i = 0; i < 100 * 4; i += 4) {
						const randBytes = rand.getBytes(i);

						const intArray = BigEndian.toIntArray(randBytes);

						expect(intArray.length).toEqual(i / 4);

						expect(BigEndian.fromIntArray(intArray)).toEqual(randBytes);
					}
				});

				it("Converts to and from int array at an offset", () => {
					const rand = new SeededRandom();

					for (let i = 0; i < 400; i += 4) {
						const randBytes = rand.getBytes(400);

						const intArray = BigEndian.toIntArray(randBytes, i);

						expect(BigEndian.fromIntArray(intArray)).toEqual(randBytes.subarray(i));
					}
				});

				it("Builds a Uint32", () => {
					const rand = new SeededRandom();

					for (let i = 0; i < 1000; i ++) {
						const bytes = rand.getBytes(4);
						const view = new DataView(bytes.buffer);

						expect(BigEndian.buildUint32(bytes[0],bytes[1],bytes[2],bytes[3])).toEqual(view.getUint32(0, false));
					}
				});

				it("Builds an Int32", () => {
					const rand = new SeededRandom();

					for (let i = 0; i < 1000; i++) {
						const bytes = rand.getBytes(4);
						const view = new DataView(bytes.buffer);

						expect(BigEndian.buildInt32(bytes[0], bytes[1], bytes[2], bytes[3])).toEqual(view.getInt32(0, false));
					}
				});

			});
		});
	}
}
