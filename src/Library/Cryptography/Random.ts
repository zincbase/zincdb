/// <reference path="SHA1.ts"/>
/// <reference path="../Encoding/Tools.ts"/>
/// <reference path="../Scheduling/Timer.ts"/>

namespace ZincDB {
	export namespace Crypto {
		export namespace Random {
			export const getAlphanumericString = function (length: number): string {
				const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
				const randomBytes = getBytes(length);

				let result = "";
				for (let i = 0; i < length; i++) {
					result += characters[Math.floor((randomBytes[i] / 256) * characters.length)];
				}

				return result;
			}

			export const getUint32 = function (): number {
				const randomBytes = getBytes(4);
				const result = Encoding.Tools.buildUint32BigEndian(randomBytes[0], randomBytes[1], randomBytes[2], randomBytes[3]);

				return result;
			}

			export const getInt32 = function (): number {
				const randomBytes = getBytes(4);
				const result = Encoding.Tools.buildInt32BigEndian(randomBytes[0], randomBytes[1], randomBytes[2], randomBytes[3]);

				return result;
			}

			export const getBytes = function (length: number): Uint8Array {
				if (runningInNodeJS()) {
					return getBytesUsingNodeCrypto(length);
				} else {
					const getRandomValues = getWebCryptoGenerator();

					if (getRandomValues) {
						try {
							const randomBytes = new Uint8Array(length);
							getRandomValues(randomBytes);
							return randomBytes;
						}
						catch (e) {
							return getBytesUsingCollectedEntropy(length);
						}
					} else {
						return getBytesUsingCollectedEntropy(length);
					}
				}
			}

			const getBytesUsingNodeCrypto = function (length: number): Uint8Array {
				const NodeCrypto: typeof nodecrypto = require("crypto");

				let randomByteBuffer: Buffer;
				try {
					randomByteBuffer = NodeCrypto.randomBytes(length);
				}
				catch (e) // In case the entropy source has been drained, resort to a weaker source
				{
					randomByteBuffer = NodeCrypto.pseudoRandomBytes(length);
				}

				return new Uint8Array(randomByteBuffer);
			}

			const getBytesUsingJSRandom = function (length: number): Uint8Array {
				const bytes = new Uint8Array(length);

				for (let i = 0; i < length; i++) {
					bytes[i] = JSRandom.getIntegerInRange(0, 256);
				}

				return bytes;
			}

			const getWebCryptoGenerator = function (): typeof crypto.getRandomValues | undefined {
				const globalObject = getGlobalObject();
				const cryptoObject: typeof crypto = globalObject["crypto"] || globalObject["msCrypto"];

				if (cryptoObject && cryptoObject.getRandomValues)
					return (array) => cryptoObject.getRandomValues(array);
				else
					return undefined;
			}

			// An implementation of an entropy collector based CSPRNG based on a simplified version of
			// the Fortuna algorithm
			const getBytesUsingCollectedEntropy = function (length: number): Uint8Array {
				// Generate the needed amount of bytes using the cipher
				const bytes = new Uint8Array(length);
				generatorCipher.transformBytesInPlace(bytes);

				return bytes;
			}

			let generatorCipher: AES_CTR_JS;
			const startCollectingEntropy = function () {
				// Initialize entropy to the Javascript RNG output
				let entropyState = getBytesUsingJSRandom(20);

				const addEntropyFromCurrentTime = () => {
					// Get current timestamp
					const timestamp = Timer.getTimestamp();
					const timestampBytes = new Uint8Array(8);
					const dataView = new DataView(timestampBytes.buffer);
					dataView.setFloat64(0, timestamp);

					// XOR the timestamp with the current entropy state, hash the result
					// and then set it as the new current entropy state
					ArrayTools.xorNumberArrays(entropyState, timestampBytes, 8);
					entropyState = SHA1.hash(entropyState);
				}

				const reseedEncryptionKeyFromEntropy = () => {
					// XOR the current entropy state with a constant mask (here: SHA1("crypto")) and then hash it
					let maskedEntropy = new Uint8Array([68, 169, 113, 51, 80, 229, 56, 88, 240, 88, 70, 61, 75, 247, 241, 229, 66, 217, 202, 75]);
					ArrayTools.xorNumberArrays(maskedEntropy, entropyState, 20);
					maskedEntropy = SHA1.hash(maskedEntropy);

					// Use the masked entropy as a key to a AES-CTR-128 cipher
					const encryptionKey = Encoding.Tools.bigEndianByteArrayToIntArray(maskedEntropy.subarray(0, 16));
					generatorCipher = new AES_CTR_JS(new AES(encryptionKey));
				}

				// Add entropy from current time and seed encryption cipher
				addEntropyFromCurrentTime();
				reseedEncryptionKeyFromEntropy();

				// Start periodically adding more entropy and reseeding the cipher
				setInterval(() => addEntropyFromCurrentTime(), 1);
				setInterval(() => reseedEncryptionKeyFromEntropy(), 100);
			}

			if (!runningInNodeJS())
				startCollectingEntropy();
		}
	}
}
