namespace ZincDB {
	export namespace Crypto {
		export namespace AES_CBC_Node {
			export const encrypt = function (plaintext: Uint8Array, keyHex: string, iv: Uint8Array): Uint8Array {
				plaintext = PKCS7.pad(plaintext, 16);
				return encryptWithoutPadding(plaintext, keyHex, iv);
			}

			export const decrypt = function (ciphertext: Uint8Array, keyHex: string, iv: Uint8Array): Uint8Array {
				const decryptedPlaintext = decryptWithoutPadding(ciphertext, keyHex, iv);
				const result = PKCS7.unpad(decryptedPlaintext, 16);

				return result;
			}

			export const encryptWithoutPadding = function (plaintext: Uint8Array, keyHex: string, iv: Uint8Array): Uint8Array {
				if (iv.length !== 16)
					throw new Error(`AES_CBC_Node.encryptWithoutPadding: invalid IV received, size must be 16.`);

				if (plaintext.length % 16 !== 0)
					throw new Error(`AES_CBC_Node.encryptWithoutPadding: plaintext length must be a multiple of 16.`)

				const cipher = getCipher(keyHex);

				let inputBlock = new Buffer(16);
				let ciphertextBlock = BufferTools.uint8ArrayToBuffer(iv);

				const output = new Uint8Array(plaintext.length);

				for (let blockStartOffset = 0; blockStartOffset < plaintext.length; blockStartOffset += 16) {
					ArrayTools.copyElements(plaintext, blockStartOffset, inputBlock, 0, 16);
					ArrayTools.xorNumberArrays(inputBlock, ciphertextBlock, 16);

					ciphertextBlock = cipher.update(inputBlock);

					ArrayTools.copyElements(ciphertextBlock, 0, output, blockStartOffset, 16);
				}

				return output;
			}

			export const decryptWithoutPadding = function (ciphertext: Uint8Array, keyHex: string, iv: Uint8Array): Uint8Array {
				if (iv.length !== 16)
					throw new Error(`AES_CBC_Node.decryptWithoutPadding: invalid IV received, size must be 16.`);

				if (ciphertext.length % 16 !== 0)
					throw new Error(`AES_CBC_Node.decryptWithoutPadding: ciphertext length must be a multiple of 16.`);

				const decipher = getDecipher(keyHex);

				const previousInputBlock = new Buffer(iv);
				let inputBlock = new Buffer(16);
				const output = new Uint8Array(ciphertext.length);

				for (let blockStartOffset = 0; blockStartOffset < ciphertext.length; blockStartOffset += 16) {
					ArrayTools.copyElements(ciphertext, blockStartOffset, inputBlock, 0, 16);

					const decryptedPlaintextBlock = decipher.update(inputBlock);

					ArrayTools.xorNumberArrays(decryptedPlaintextBlock, previousInputBlock, 16);

					ArrayTools.copyElements(decryptedPlaintextBlock, 0, output, blockStartOffset, 16);
					ArrayTools.copyElements(inputBlock, 0, previousInputBlock, 0, 16);
				}

				return output;
			}

			const cipherCache: { [keyHex: string]: nodecrypto.Cipher } = {};
			const decipherCache: { [keyHex: string]: nodecrypto.Decipher } = {};

			export const getCipher = function (keyHex: string) {
				let cachedCipher = cipherCache[keyHex];

				if (!cachedCipher) {
					const NodeCrypto: typeof nodecrypto = require("crypto");

					cachedCipher = NodeCrypto.createCipheriv("aes-128-ecb", new Buffer(keyHex, "hex"), new Buffer(0));
					cachedCipher.setAutoPadding(false);

					cipherCache[keyHex] = cachedCipher;
				}

				return cachedCipher;
			}

			export const getDecipher = function (keyHex: string) {
				let cachedDecipher = decipherCache[keyHex];

				if (!cachedDecipher) {
					const NodeCrypto: typeof nodecrypto = require("crypto");

					cachedDecipher = NodeCrypto.createDecipheriv("aes-128-ecb", new Buffer(keyHex, "hex"), new Buffer(0));
					cachedDecipher.setAutoPadding(false);

					decipherCache[keyHex] = cachedDecipher;
				}

				return cachedDecipher;
			}
		}
	}
}
