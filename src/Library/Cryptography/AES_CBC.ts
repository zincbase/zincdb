namespace ZincDB {
	export namespace Crypto {
		export namespace AES_CBC {
			export const zeroBlock = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

			export const encrypt = function (plaintext: Uint8Array, keyHex: string, iv: Uint8Array): Uint8Array {
				/*if (runningInNodeJS())
					return encryptUsingNode_1(plaintext, keyHex, iv);
				else*/
				return encryptUsingJS(plaintext, keyHex, iv);
			}

			export const decrypt = function (ciphertext: Uint8Array, keyHex: string, iv: Uint8Array): Uint8Array {
				/*if (runningInNodeJS())
					return decryptUsingNode_1(ciphertext, keyHex, iv);
				else*/
				return decryptUsingJS(ciphertext, keyHex, iv);
			}

			export const encryptAsync = async function (plaintext: Uint8Array, keyHex: string, iv: Uint8Array): Promise<Uint8Array> {
				const webCryptoAvailable = await Crypto.webCryptoAvailable();

				if (webCryptoAvailable)
					return encryptAsyncUsingWebCrypto(plaintext, keyHex, iv);
				else if (runningInNodeJS())
					return encryptAsyncUsingNode(plaintext, keyHex, iv);
				else
					return encryptAsyncUsingJS(plaintext, keyHex, iv);
			}

			export const decryptAsync = async function (ciphertext: Uint8Array, keyHex: string, iv: Uint8Array): Promise<Uint8Array> {
				const webCryptoAvailable = await Crypto.webCryptoAvailable();

				if (webCryptoAvailable)
					return decryptAsyncUsingWebCrypto(ciphertext, keyHex, iv);
				else if (runningInNodeJS())
					return decryptAsyncUsingNode(ciphertext, keyHex, iv);
				else
					return decryptAsyncUsingJS(ciphertext, keyHex, iv);
			}

			// Native JS implementation
			export const encryptUsingJS = function (plaintext: Uint8Array, keyHex: string, iv: Uint8Array): Uint8Array {
				return AES_CBC_JS.encrypt(plaintext, keyHex, iv);
			}

			export const encryptAsyncUsingJS = async function (plaintext: Uint8Array, keyHex: string, iv: Uint8Array): Promise<Uint8Array> {
				return encryptUsingJS(plaintext, keyHex, iv);
			}

			export const decryptUsingJS = function (ciphertext: Uint8Array, keyHex: string, iv: Uint8Array): Uint8Array {
				return AES_CBC_JS.decrypt(ciphertext, keyHex, iv);
			}

			export const decryptAsyncUsingJS = async function (ciphertext: Uint8Array, keyHex: string, iv: Uint8Array): Promise<Uint8Array> {
				return decryptUsingJS(ciphertext, keyHex, iv);
			}

			// Node library implementation
			export const encryptUsingNode_1 = function (plaintext: Uint8Array, keyHex: string, iv: Uint8Array): Uint8Array {
				return AES_CBC_Node.encrypt(plaintext, keyHex, iv);
			}

			export const encryptUsingNode_2 = function (plaintext: Uint8Array, keyHex: string, iv: Uint8Array): Uint8Array {
				const NodeCrypto: typeof nodecrypto = require("crypto");
				const cipher = NodeCrypto.createCipheriv("aes-128-cbc", new Buffer(keyHex, "hex"), BufferTools.uint8ArrayToBuffer(iv));
				cipher.setAutoPadding(true);

				const part1 = cipher.update(BufferTools.uint8ArrayToBuffer(plaintext));
				const part2 = cipher.final();

				return BufferTools.bufferToUint8Array(Buffer.concat([part1, part2], part1.length + part2.length));
			}

			export const encryptAsyncUsingNode = async function (plaintext: Uint8Array, keyHex: string, iv: Uint8Array): Promise<Uint8Array> {
				return encryptUsingNode_2(plaintext, keyHex, iv);
			}

			export const decryptUsingNode_1 = function (ciphertext: Uint8Array, keyHex: string, iv: Uint8Array): Uint8Array {
				return AES_CBC_Node.decrypt(ciphertext, keyHex, iv);
			}

			export const decryptUsingNode_2 = function (ciphertext: Uint8Array, keyHex: string, iv: Uint8Array): Uint8Array {
				const NodeCrypto: typeof nodecrypto = require("crypto");
				const decipher = NodeCrypto.createDecipheriv("aes-128-cbc", new Buffer(keyHex, "hex"), BufferTools.uint8ArrayToBuffer(iv));
				decipher.setAutoPadding(true);

				const part1 = decipher.update(BufferTools.uint8ArrayToBuffer(ciphertext));
				const part2 = decipher.final();

				return BufferTools.bufferToUint8Array(Buffer.concat([part1, part2], part1.length + part2.length));
			}

			export const decryptAsyncUsingNode = async function (ciphertext: Uint8Array, keyHex: string, iv: Uint8Array): Promise<Uint8Array> {
				return decryptUsingNode_2(ciphertext, keyHex, iv);
			}

			// Web crypto implementation
			export const encryptAsyncUsingWebCrypto = async function (plaintext: Uint8Array, keyHex: string, iv: Uint8Array): Promise<Uint8Array> {
				const cryptoKey = await getWebCryptoKey(keyHex);
				const ciphertext = await crypto.subtle.encrypt({ name: "AES-CBC", iv: iv }, cryptoKey, plaintext);
				return new Uint8Array(ciphertext);
			}

			export const decryptAsyncUsingWebCrypto = async function (ciphertext: Uint8Array, keyHex: string, iv: Uint8Array): Promise<Uint8Array> {
				const cryptoKey = await getWebCryptoKey(keyHex);
				const plainText = await crypto.subtle.decrypt({ name: "AES-CBC", iv: iv }, cryptoKey, ciphertext);
				return new Uint8Array(plainText);
			}

			const webCryptoKeyCache: { [keyHex: string]: CryptoKey } = {};

			export const getWebCryptoKey = async function (keyHex: string): Promise<CryptoKey> {
				const cachedObject = webCryptoKeyCache[keyHex];

				if (cachedObject) {
					return cachedObject;
				} else {
					const newCryptoKey = await crypto.subtle.importKey("raw", Encoding.Hex.decode(keyHex), <Algorithm>{ name: "AES-CBC" }, true, ["encrypt", "decrypt"]);
					webCryptoKeyCache[keyHex] = newCryptoKey;
					return newCryptoKey;
				}
			}
		}
	}
}
