namespace ZincDB {
	export namespace Crypto {
		export namespace PKCS7 {
			export const pad = function (input: Uint8Array, blockSize: number): Uint8Array {
				if (!input)
					throw new TypeError(`pad: No input was given.`);

				const bytesToAdd = blockSize - (input.length % blockSize);

				const result = new Uint8Array(input.length + bytesToAdd);
				result.set(input);

				for (let i = input.length; i < result.length; i++)
					result[i] = bytesToAdd;

				return result;
			}

			export const unpad = function (input: Uint8Array, blockSize: number): Uint8Array {
				if (!input)
					throw new TypeError(`unpad: No input was given.`);

				if (input.length < blockSize)
					throw new Error(`unpad: Input size is smaller than then block size.`);

				if (input.length % blockSize)
					throw new Error(`unpad: Input size is not a multiple of the block size.`);

				const bytesToRemove = input[input.length - 1];

				return input.subarray(0, input.length - bytesToRemove);
			}
		}
	}
}
