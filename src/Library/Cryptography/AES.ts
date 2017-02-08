namespace ZincDB {
	export namespace Crypto {
		/** Low-level AES implementation.
		 *
		 * This file contains a low-level implementation of AES, optimized for
		 * size and for efficiency on several browsers.  It is based on
		 * OpenSSL's aes_core.c, a public-domain implementation by Vincent
		 * Rijmen, Antoon Bosselaers and Paulo Barreto.
		 *
		 * An older version of this implementation is available in the public
		 * domain, but this one is (c) Emily Stark, Mike Hamburg, Dan Boneh,
		 * Stanford University 2008-2010 and BSD-licensed for liability
		 * reasons.
		 *
		 * @author Emily Stark
		 * @author Mike Hamburg
		 * @author Dan Boneh
		 */

		/**
		 * Schedule out an AES key for both encryption and decryption.  This
		 * is a low-level class.  Use a cipher mode to do bulk encryption.
		 *
		 * @constructor
		 * @param {Array} key The key as an array of 4, 6 or 8 words.
		 *
		 * @class Advanced Encryption Standard (low-level interface)
		 */
		export class AES {
			// The expanded S-box and inverse S-box tables.  These will be computed
			// on the client so that we don't have to send them down the wire.
			//
			// There are two tables, tables[0] is for encryption and
			// tables[1] is for decryption.
			//
			// The first 4 sub-tables are the expanded S-box with MixColumns.  The
			// last (tables[0/1][4]) is the S-box itself.

			static encTable: number[][] = [[], [], [], [], []];
			static decTable: number[][] = [[], [], [], [], []];

			subkeys: number[][];

			constructor(public key: number[]) {
				if (AES.encTable[0][0] === undefined)
					AES.initializeTables();

				let i: number, j: number, tmp: number;
				let encKey: number[], decKey: number[];
				const sbox = AES.encTable[4];
				const decTable = AES.decTable;
				const keyLen = key.length;
				let rcon = 1;

				if (keyLen !== 4 && keyLen !== 6 && keyLen !== 8)
					throw new RangeError(`Invalid AES key size`);

				this.subkeys = [encKey = key.slice(0), decKey = []];

				// Schedule encryption keys
				for (i = keyLen; i < 4 * keyLen + 28; i++) {
					tmp = encKey[i - 1];

					// Apply sbox
					if (i % keyLen === 0 || (keyLen === 8 && i % keyLen === 4)) {
						tmp = sbox[tmp >>> 24] << 24 ^ sbox[tmp >> 16 & 255] << 16 ^ sbox[tmp >> 8 & 255] << 8 ^ sbox[tmp & 255];

						// shift rows and add rcon
						if (i % keyLen === 0) {
							tmp = tmp << 8 ^ tmp >>> 24 ^ rcon << 24;
							rcon = rcon << 1 ^ (rcon >> 7) * 283;
						}
					}

					encKey[i] = encKey[i - keyLen] ^ tmp;
				}

				// schedule decryption keys
				for (j = 0; i; j++ , i--) {
					tmp = encKey[j & 3 ? i : i - 4];
					if (i <= 4 || j < 4) {
						decKey[j] = tmp;
					}
					else {
						decKey[j] = decTable[0][sbox[tmp >>> 24]] ^
							decTable[1][sbox[tmp >> 16 & 255]] ^
							decTable[2][sbox[tmp >> 8 & 255]] ^
							decTable[3][sbox[tmp & 255]];
					}
				}
			}

			// Initializes the s-box tables
			private static initializeTables() {
				const encTable = AES.encTable;
				const decTable = AES.decTable;
				const sbox = encTable[4];
				const sboxInv = decTable[4];
				let i: number, x: number, xInv: number;
				const d: number[] = [];
				const th: number[] = [];
				let x2: number, x4: number, x8: number, s: number, tEnc: number, tDec: number;

				// Compute double and third tables
				for (i = 0; i < 256; i++) {
					th[(d[i] = i << 1 ^ (i >> 7) * 283) ^ i] = i;
				}

				for (x = xInv = 0; !sbox[x]; x ^= x2 || 1, xInv = th[xInv] || 1) {
					// Compute sbox
					s = xInv ^ xInv << 1 ^ xInv << 2 ^ xInv << 3 ^ xInv << 4;
					s = s >> 8 ^ s & 255 ^ 99;
					sbox[x] = s;
					sboxInv[s] = x;

					// Compute MixColumns
					x8 = d[x4 = d[x2 = d[x]]];
					tDec = x8 * 0x1010101 ^ x4 * 0x10001 ^ x2 * 0x101 ^ x * 0x1010100;
					tEnc = d[s] * 0x101 ^ s * 0x1010100;

					for (i = 0; i < 4; i++) {
						encTable[i][x] = tEnc = tEnc << 24 ^ tEnc >>> 8;
						decTable[i][s] = tDec = tDec << 24 ^ tDec >>> 8;
					}
				}

				// Compactify.  Considerable speedup on Firefox.
				for (i = 0; i < 5; i++) {
					encTable[i] = encTable[i].slice(0);
					decTable[i] = decTable[i].slice(0);
				}
			}

			// Encryption and decryption core.
			// input: Four words to be encrypted or decrypted.
			// dir: The direction, 0 for encryption and 1 for decryption.
			// [returned]: The four encrypted or decrypted words.
			private transformBlock(input: number[], dir: AESOperationType, output = [0, 0, 0, 0]): number[] {
				if (input.length !== 4)
					throw new RangeError(`AES.transformBlock: Invalid AES block size`);

				const keys = this.subkeys[dir];

				// state letiables a,b,c,d are loaded with pre-whitened data
				let a = input[0] ^ keys[0];
				let b = input[dir ? 3 : 1] ^ keys[1];
				let c = input[2] ^ keys[2];
				let d = input[dir ? 1 : 3] ^ keys[3];
				let a2: number, b2: number, c2: number;

				let innerRoundCount = keys.length / 4 - 2;
				let i: number;
				let kIndex = 4;

				if (dir == 0)
					var table = AES.encTable;
				else
					var table = AES.decTable;

				// load up the tables
				const t0 = table[0];
				const t1 = table[1];
				const t2 = table[2];
				const t3 = table[3];
				const sbox = table[4];

				// Inner rounds. Cribbed from OpenSSL.
				for (i = 0; i < innerRoundCount; i++) {
					a2 = t0[a >>> 24] ^ t1[b >> 16 & 255] ^ t2[c >> 8 & 255] ^ t3[d & 255] ^ keys[kIndex];
					b2 = t0[b >>> 24] ^ t1[c >> 16 & 255] ^ t2[d >> 8 & 255] ^ t3[a & 255] ^ keys[kIndex + 1];
					c2 = t0[c >>> 24] ^ t1[d >> 16 & 255] ^ t2[a >> 8 & 255] ^ t3[b & 255] ^ keys[kIndex + 2];
					d = t0[d >>> 24] ^ t1[a >> 16 & 255] ^ t2[b >> 8 & 255] ^ t3[c & 255] ^ keys[kIndex + 3];

					kIndex += 4;
					a = a2;
					b = b2;
					c = c2;
				}

				// Last round.
				for (i = 0; i < 4; i++) {
					output[dir ? 3 & -i : i] =
						sbox[a >>> 24] << 24 ^
						sbox[b >> 16 & 255] << 16 ^
						sbox[c >> 8 & 255] << 8 ^
						sbox[d & 255] ^
						keys[kIndex++];

					a2 = a;
					a = b;
					b = c;
					c = d;
					d = a2;
				}

				return output;
			}

			encryptBlock(input: number[], output?: number[]): number[] {
				return this.transformBlock(input, 0, output);
			}

			decryptBlock(input: number[], output?: number[]): number[] {
				return this.transformBlock(input, 1, output);
			}

			encryptByteBlock(input: Uint8Array, output?: Uint8Array): Uint8Array {
				const result = this.encryptBlock(Encoding.BigEndian.toIntArray(input));
				return Encoding.BigEndian.fromIntArray(result);
			}

			decryptByteBlock(input: Uint8Array, output?: Uint8Array): Uint8Array {
				const result = this.decryptBlock(Encoding.BigEndian.toIntArray(input));
				return Encoding.BigEndian.fromIntArray(result);
			}

			static cache: { [keyHex: string]: AES } = {};

			static getAES(keyHex: string): AES {
				let cachedAESObject = this.cache[keyHex];

				if (!cachedAESObject) {
					cachedAESObject = new AES(Encoding.BigEndian.toIntArray(Encoding.Hex.decode(keyHex)));
					this.cache[keyHex] = cachedAESObject;
				}

				return cachedAESObject;
			}
		}

		export const enum AESOperationType {
			Encryption = 0,
			Decryption = 1
		}
	}
}
