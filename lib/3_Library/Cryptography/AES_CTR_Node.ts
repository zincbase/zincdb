namespace ZincDB {
	export namespace Crypto {
		export class AES_CTR_Node implements AES_CTR_Generic {
			nodeCipher: nodecrypto.Cipher;
			keyBytes: Uint8Array;

			constructor(public key: number[], nonce: number[] = [0, 0, 0], initialCounter = 0) {
				this.keyBytes = Encoding.Tools.intArrayToBigEndianByteArray(key);
				this.reset(nonce, initialCounter);
			}

			transformBytes(input: Uint8Array, inputStartOffset: number, output: Uint8Array, outputOffset: number, count: number) {
				const plainText = input.subarray(inputStartOffset, inputStartOffset + count);
				const result = BufferTools.bufferToUint8Array(<any>this.nodeCipher.update(BufferTools.uint8ArrayToBuffer(plainText)));
				output.set(result, outputOffset);
			}

			transformBytesInPlace(input: Uint8Array, startOffset?: number, count?: number) {
				if (startOffset == undefined)
					startOffset = 0;

				if (count == undefined)
					count = input.length;

				this.transformBytes(input, startOffset, input, startOffset, count);
			}

			reset(nonce: number[], counter: number = 0) {
				const NodeCrypto: typeof nodecrypto = require("crypto");

				let iv = new Uint8Array(16);
				iv.set(Encoding.Tools.intArrayToBigEndianByteArray(nonce));

				if (counter != 0)
					iv.set(Encoding.Tools.intArrayToBigEndianByteArray([counter]), 12);

				this.nodeCipher = NodeCrypto.createCipheriv("aes-128-ctr", BufferTools.uint8ArrayToBuffer(this.keyBytes), BufferTools.uint8ArrayToBuffer(iv));
			}
		}
	}
}