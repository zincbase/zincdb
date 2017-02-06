namespace ZincDB {
	export namespace Crypto {
		export class AES_CTR_JS implements AES_CTR_Generic {
			key: number[];
			keystreamBlock: number[] = [0, 0, 0, 0];
			currentByteOffsetInBlock: number;

			reusableCiphertextBlock: number[] = [0, 0, 0, 0];
			reusableCiphertextBlockBytes: Uint8Array = new Uint8Array(16);

			constructor(public aes: AES, nonce: number[] = [0, 0, 0], initialCounter = 0) {
				this.key = aes.key;
				this.reset(nonce, initialCounter);
			}

			transformBytes(input: Uint8Array, inputStartOffset: number, output: Uint8Array, outputOffset: number, count: number) {
				for (let readPosition = inputStartOffset, writePosition = outputOffset, endPosition = inputStartOffset + count;
					readPosition < endPosition;
					readPosition++ , writePosition++ , this.currentByteOffsetInBlock++) {
					if (this.currentByteOffsetInBlock === 16) {
						this.aes.encryptBlock(this.keystreamBlock, this.reusableCiphertextBlock);
						Encoding.Tools.intArrayToBigEndianByteArray(this.reusableCiphertextBlock, 0, this.reusableCiphertextBlockBytes);

						this.keystreamBlock[3] = (this.keystreamBlock[3] + 1) | 0; // Increment the counter, wrap on MaxInt, this allows safely encrypting up to 68.72GB of data.
						this.currentByteOffsetInBlock = 0;
					}

					output[writePosition] = input[readPosition] ^ this.reusableCiphertextBlockBytes[this.currentByteOffsetInBlock];
				}
			}

			transformBytesInPlace(input: Uint8Array, startOffset?: number, count?: number) {
				if (startOffset == undefined)
					startOffset = 0;

				if (count == undefined)
					count = input.length;

				this.transformBytes(input, startOffset, input, startOffset, count);
			}

			reset(nonce: number[], counter: number = 0) {
				this.keystreamBlock[0] = nonce[0] || 0;
				this.keystreamBlock[1] = nonce[1] || 0;
				this.keystreamBlock[2] = nonce[2] || 0;
				this.keystreamBlock[3] = nonce[3] ^ counter;

				this.currentByteOffsetInBlock = 16;
			}
		}
	}
}