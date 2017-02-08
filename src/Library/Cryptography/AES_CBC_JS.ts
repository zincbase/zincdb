namespace ZincDB {
	export namespace Crypto {
		export namespace AES_CBC_JS {
			export const encrypt = function (plaintext: Uint8Array, keyHex: string, iv: Uint8Array): Uint8Array {
				plaintext = PKCS7.pad(plaintext, 16);
				return encryptWithoutPadding(plaintext, keyHex, iv);
			}

			export const decrypt = function (ciphertext: Uint8Array, keyHex: string, iv: Uint8Array): Uint8Array {
				const plaintext = decryptWithoutPadding(ciphertext, keyHex, iv);
				return PKCS7.unpad(plaintext, 16);
			}

			export const encryptWithoutPadding = function (plaintext: Uint8Array, keyHex: string, iv: Uint8Array): Uint8Array {
				if (iv.length !== 16)
					throw new Error(`AES_CBC.encrypt: invalid IV received, size must be 16.`);

				if (plaintext.length % 16 !== 0)
					throw new Error(`AES_CBC.encrypt: plaintext length must be a multiple of 16.`)

				const aes = AES.getAES(keyHex);

				let inputBlock = [0, 0, 0, 0];
				const ciphertextBlock = Encoding.BigEndian.toIntArray(iv);

				const cipherText = new Uint8Array(plaintext.length);

				for (let blockStartOffset = 0; blockStartOffset < plaintext.length; blockStartOffset += 16) {
					Encoding.BigEndian.toIntArray(plaintext, blockStartOffset, inputBlock, 0, 16);

					ArrayTools.xorNumberArrays(inputBlock, ciphertextBlock, 4);
					aes.encryptBlock(inputBlock, ciphertextBlock);

					Encoding.BigEndian.fromIntArray(ciphertextBlock, 0, cipherText, blockStartOffset);
				}

				return cipherText;
			}

			export const decryptWithoutPadding = function (ciphertext: Uint8Array, keyHex: string, iv: Uint8Array): Uint8Array {
				if (iv.length !== 16)
					throw new Error(`AES_CBC.decrypt: invalid IV received.`);

				if (ciphertext.length % 16 !== 0)
					throw new Error(`AES_CBC.decrypt: ciphertext length must be a multiple of 16.`)

				const aes = AES.getAES(keyHex);

				const previousInputBlock = Encoding.BigEndian.toIntArray(iv);
				let inputBlock = [0, 0, 0, 0];
				const outputBlock = [0, 0, 0, 0];

				const decryptedPlaintext = new Uint8Array(ciphertext.length);

				for (let blockStartOffset = 0; blockStartOffset < ciphertext.length; blockStartOffset += 16) {
					Encoding.BigEndian.toIntArray(ciphertext, blockStartOffset, inputBlock, 0, 16);

					aes.decryptBlock(inputBlock, outputBlock);
					ArrayTools.xorNumberArrays(outputBlock, previousInputBlock, 4);

					Encoding.BigEndian.fromIntArray(outputBlock, 0, decryptedPlaintext, blockStartOffset, 4);

					ArrayTools.copyElements(inputBlock, 0, previousInputBlock, 0, 4);
				}

				return decryptedPlaintext;
			}
		}
	}
}
