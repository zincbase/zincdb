namespace ZincDB {
	export namespace Encoding {
		export namespace Tools {
			export const intArrayToBigEndianByteArray = function(intArray: number[], readOffset = 0, output?: Uint8Array, writeOffset = 0, intCount?: number): Uint8Array {
				if (!intCount)
					intCount = intArray.length - readOffset;

				const readEndOffset = readOffset + intCount;
				if (readEndOffset > intArray.length)
					throw new Error("intArrayToBigEndianByteArray: read end offset is greater than the array length.");

				const writeEndOffset = writeOffset + (intCount * 4);

				if (!output)
					output = new Uint8Array(writeEndOffset);
				else if (output.length < writeEndOffset)
					throw new Error("intArrayToBigEndianByteArray: output array does not have enough space for the given start offset.");

				for (readOffset; readOffset < readEndOffset; readOffset++) {
					let int32 = intArray[readOffset];

					output[writeOffset++] = (int32 >>> 24) & 255;
					output[writeOffset++] = (int32 >>> 16) & 255;
					output[writeOffset++] = (int32 >>> 8) & 255;
					output[writeOffset++] = (int32) & 255;
				}

				return output;
			}

			export const bigEndianByteArrayToIntArray = function(input: Uint8Array, readOffset: number = 0, output?: number[], writeOffset: number = 0, byteCount?: number, signed = true): number[] {
				if (!byteCount)
					byteCount = input.length - readOffset;

				const readEndOffset = readOffset + byteCount;
				if (readEndOffset > input.length)
					throw new Error("bigEndianByteArrayToIntArray: read end offset is greater than the array length.");

				const writeEndOffset = writeOffset + Math.ceil(byteCount / 4);

				if (!output)
					output = new Array(writeEndOffset)
				else if (output.length < writeEndOffset)
					throw new Error("bigEndianByteArrayToIntArray: output array does not have enough space for the given start offset.");

				for (writeOffset; writeOffset < writeEndOffset; writeOffset++) {
					let int32 = 0;
					int32 |= input[readOffset++] << 24;
					int32 |= input[readOffset++] << 16;
					int32 |= input[readOffset++] << 8;
					int32 |= input[readOffset++] << 0; // Ensure that undefined will be converted to zero in case the input byte count is not divisible by 4

					if (signed)
						output[writeOffset] = int32;
					else
						output[writeOffset] = int32 >>> 0;
				}

				return output;
			}

			export const uint8ArrayToNumberArray = function(uint8Array: Uint8Array): number[] {
				const numberArray = new Array(uint8Array.length);

				for (let i = 0; i < uint8Array.length; i++)
					numberArray[i] = uint8Array[i];

				return numberArray;
			}

			export const buildUint32BigEndian = function(b0: number, b1: number, b2: number, b3: number): number {
				return (b0 << 24 | b1 << 16 | b2 << 8 | b3) >>> 0;
			}

			export const buildInt32BigEndian = function(b0: number, b1: number, b2: number, b3: number): number {
				return b0 << 24 | b1 << 16 | b2 << 8 | b3;
			}
		}
	}
}
