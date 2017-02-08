namespace ZincDB {
	export namespace Crypto {
		export class AES_CTR_Node implements AES_CTR_Generic {
			nodeCipher: nodecrypto.Cipher;
			keyBytes: Uint8Array;

			constructor(public key: number[], nonce: number[] = [0, 0, 0, 0], initialCounter = 0) {
				this.keyBytes = Encoding.BigEndian.fromIntArray(key);
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

				const iv = Encoding.BigEndian.fromIntArray([nonce[0], nonce[1], nonce[2], nonce[3] ^ counter]);
				this.nodeCipher = NodeCrypto.createCipheriv("aes-128-ctr", BufferTools.uint8ArrayToBuffer(this.keyBytes), BufferTools.uint8ArrayToBuffer(iv));
			}
		}
	}
}
