namespace ZincDB {
	if (runningInNodeJS()) {
		describe("BufferUtils:", () => {
			const buffer0 = new Buffer([1, 2, 3]);
			const buffer1 = new Buffer([4, 5]);
			const buffer2 = new Buffer([6, 7, 8, 9]);
			const buffer3 = new Buffer([10]);

			const testData = [buffer0, buffer1, buffer2, buffer3];

			it("Slices an array of buffers at a given start offset", () => {
				expect(BufferTools.sliceBufferArray(testData, 0)).toEqual(testData);
				expect(BufferTools.sliceBufferArray(testData, 1)).toEqual([buffer0.slice(1), buffer1, buffer2, buffer3]);
				expect(BufferTools.sliceBufferArray(testData, 2)).toEqual([buffer0.slice(2), buffer1, buffer2, buffer3]);
				expect(BufferTools.sliceBufferArray(testData, 3)).toEqual([buffer1, buffer2, buffer3]);
				expect(BufferTools.sliceBufferArray(testData, 4)).toEqual([buffer1.slice(1), buffer2, buffer3]);
				expect(BufferTools.sliceBufferArray(testData, 5)).toEqual([buffer2, buffer3]);
				expect(BufferTools.sliceBufferArray(testData, 6)).toEqual([buffer2.slice(1), buffer3]);
				expect(BufferTools.sliceBufferArray(testData, 7)).toEqual([buffer2.slice(2), buffer3]);
				expect(BufferTools.sliceBufferArray(testData, 8)).toEqual([buffer2.slice(3), buffer3]);
				expect(BufferTools.sliceBufferArray(testData, 9)).toEqual([buffer3]);
				expect(BufferTools.sliceBufferArray(testData, 10)).toEqual([]);
				expect(BufferTools.sliceBufferArray(testData, 11)).toEqual([]);
				expect(BufferTools.sliceBufferArray(testData, 999999)).toEqual([]);
			});
		});
	}
}