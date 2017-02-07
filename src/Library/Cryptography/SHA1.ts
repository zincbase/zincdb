namespace ZincDB {
	export namespace Crypto {
		export namespace SHA1 {
			if (runningInNodeJS())
				var NodeCrypto: typeof nodecrypto = require("crypto");

			export const hash = function (bytes: Uint8Array | Buffer): Uint8Array {
				if (runningInNodeJS()) {
					if (Buffer.isBuffer(bytes))
						return hashUsingNode(bytes);
					else
						return hashUsingNode(BufferTools.uint8ArrayToBuffer(bytes));
				}
				else {
					return hashUsingJS(<Uint8Array>bytes);
				}
			}

			export const hashStringToHex = function (input: string): string {
				const result = hash(Encoding.UTF8.encode(input));

				return Encoding.Hex.encode(result);
			}

			const extendedWordsHelperBuffer = new Array(80);

			export const hashUsingNode = function (bytes: Buffer): Uint8Array {
				if (!Buffer.isBuffer(bytes))
					throw new Error("Received bytes are not a buffer");

				const sha1 = NodeCrypto.createHash("sha1");
				const hash = sha1.update(bytes).digest();
				return BufferTools.bufferToUint8Array(hash);
			}

			export const hashUsingJS = function (bytes: Uint8Array): Uint8Array {
				const words = Encoding.Tools.bigEndianByteArrayToIntArray(bytes);
				const resultWords = hashWordsUsingJS(words, bytes.length * 8);
				return Encoding.Tools.intArrayToBigEndianByteArray(resultWords);
			}

			/* Calculate the SHA-1 of an array of big-endian words, given a bit length
			 *
			 * Based on:
			 *
			 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
			 * in FIPS 180-1.
			 *
			 * Version 2.2, Copyright Paul Johnston 2000-2009.
			 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
			 * Distributed under the BSD License
			 *
			 * Source: http://pajhome.org.uk/crypt/md5/sha1.html
			*/
			const hashWordsUsingJS = function (words: number[], bitLength?: number): number[] {
				// Helper functions:
				//
				// Add integers, wrapping at 2^32.
				const add = (x: number, y: number): number => {
					// This uses 16-bit operations internally
					// to work around bugs in some JS interpreters.
					//
					const lowWord = (x & 0xFFFF) + (y & 0xFFFF);
					const highWord = (x >> 16) + (y >> 16) + (lowWord >> 16);
					const result = (highWord << 16) | (lowWord & 0xFFFF);

					return result;
				}

				// Bitwise rotate a 32-bit number to the left.
				const rotateLeft = (num: number, count: number): number => {
					return (num << count) | (num >>> (32 - count));
				}

				if (bitLength === undefined)
					bitLength = words.length * 32;

				// Append padding
				words[bitLength >> 5] |= 0x80 << (24 - bitLength % 32);
				words[((bitLength + 64 >> 9) << 4) + 15] = bitLength;

				// If the array has been extended, replace undefined values with zeroes
				for (let i = 0; i < words.length; i++) {
					if (words[i] === undefined)
						words[i] = 0;
				}

				const extendedWords = extendedWordsHelperBuffer;

				let a = 1732584193;
				let b = -271733879;
				let c = -1732584194;
				let d = 271733878;
				let e = -1009589776;

				for (let i = 0; i < words.length; i += 16) {
					let olda = a;
					let oldb = b;
					let oldc = c;
					let oldd = d;
					let olde = e;

					for (let j = 0; j < 80; j++) {
						// Extend words to from 16 to 80
						if (j < 16)
							extendedWords[j] = words[i + j];
						else
							extendedWords[j] = rotateLeft(extendedWords[j - 3] ^ extendedWords[j - 8] ^ extendedWords[j - 14] ^ extendedWords[j - 16], 1);

						// Find the tripconst combination and additive constant for this iteration
						let tripletCombination: number;
						let additiveConstant: number;

						if (j < 20) {
							tripletCombination = (b & c) | ((~b) & d);
							additiveConstant = 1518500249;
						}
						else if (j < 40) {
							tripletCombination = b ^ c ^ d;
							additiveConstant = 1859775393;
						}
						else if (j < 60) {
							tripletCombination = (b & c) | (b & d) | (c & d);
							additiveConstant = -1894007588;
						}
						else // if (j < 80)
						{
							tripletCombination = b ^ c ^ d;
							additiveConstant = -899497514;
						}
						//

						const temp = add(add(rotateLeft(a, 5), tripletCombination), add(add(e, extendedWords[j]), additiveConstant));

						e = d;
						d = c;
						c = rotateLeft(b, 30);
						b = a;
						a = temp;
					}

					a = add(a, olda);
					b = add(b, oldb);
					c = add(c, oldc);
					d = add(d, oldd);
					e = add(e, olde);
				}

				return [a, b, c, d, e];
			}
		}
	}
}
