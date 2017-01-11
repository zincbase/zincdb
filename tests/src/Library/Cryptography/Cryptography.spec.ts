namespace ZincDB {
	describe("Crypto:", () => {
		describe("AES:", () => {
			// Test vectors from http://www.inconteam.com/software-development/41-encryption/55-aes-test-vectors#aes-ecb-128

			it("Encrypts and decrypts using a test 128 bit key and data", () => {
				runAESTest("2b7e151628aed2a6abf7158809cf4f3c", "6bc1bee22e409f96e93d7e117393172a", "3ad77bb40d7a3660a89ecaf32466ef97");
				runAESTest("2b7e151628aed2a6abf7158809cf4f3c", "ae2d8a571e03ac9c9eb76fac45af8e51", "f5d3d58503b9699de785895a96fdbaaf");
				runAESTest("2b7e151628aed2a6abf7158809cf4f3c", "30c81c46a35ce411e5fbc1191a0a52ef", "43b1cd7f598ece23881b00e3ed030688");
				runAESTest("2b7e151628aed2a6abf7158809cf4f3c", "f69f2445df4f9b17ad2b417be66c3710", "7b0c785e27e8ad3f8223207104725dd4");
			});

			it("Encrypts and decrypts using a test 192 bit key and data", () => {
				runAESTest("8e73b0f7da0e6452c810f32b809079e562f8ead2522c6b7b", "6bc1bee22e409f96e93d7e117393172a", "bd334f1d6e45f25ff712a214571fa5cc");
				runAESTest("8e73b0f7da0e6452c810f32b809079e562f8ead2522c6b7b", "ae2d8a571e03ac9c9eb76fac45af8e51", "974104846d0ad3ad7734ecb3ecee4eef");
				runAESTest("8e73b0f7da0e6452c810f32b809079e562f8ead2522c6b7b", "30c81c46a35ce411e5fbc1191a0a52ef", "ef7afd2270e2e60adce0ba2face6444e");
				runAESTest("8e73b0f7da0e6452c810f32b809079e562f8ead2522c6b7b", "f69f2445df4f9b17ad2b417be66c3710", "9a4b41ba738d6c72fb16691603c18e0e");
			});

			it("Encrypts and decrypts using a test 256 bit key and data", () => {
				runAESTest("603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4", "6bc1bee22e409f96e93d7e117393172a", "f3eed1bdb5d2a03c064b5a7e3db181f8");
				runAESTest("603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4", "ae2d8a571e03ac9c9eb76fac45af8e51", "591ccb10d410ed26dc5ba74a31362870");
				runAESTest("603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4", "30c81c46a35ce411e5fbc1191a0a52ef", "b6ed21b99ca6f4f9f153e7b1beafed1d");
				runAESTest("603deb1015ca71be2b73aef0857d77811f352c073b6108d72d9810a30914dff4", "f69f2445df4f9b17ad2b417be66c3710", "23304b7a39f9f3ff067d8d8f9e24ecc7");
			});

			function runAESTest(keyHex: string, plaintextHex: string, expectedCiphertextHex: string) {
				const key = Encoding.Hex.decodeWithJS(keyHex);
				const plaintext = Encoding.Hex.decodeWithJS(plaintextHex);
				const expectedCiphertext = Encoding.Hex.decodeWithJS(expectedCiphertextHex)

				const keyNumberArray = Encoding.Tools.bigEndianByteArrayToIntArray(key);
				const plaintextNumberArray = Encoding.Tools.bigEndianByteArrayToIntArray(plaintext);
				const expectedCiphertextNumberArray = Encoding.Tools.bigEndianByteArrayToIntArray(expectedCiphertext);

				const aes = new Crypto.AES(keyNumberArray);
				const cipherText = aes.encryptBlock(plaintextNumberArray);

				expect(cipherText).toEqual(expectedCiphertextNumberArray);

				const decryptedPlainText = aes.decryptBlock(cipherText);

				expect(decryptedPlainText).toEqual(plaintextNumberArray);
			}

			if (runningInNodeJS()) {
				it("Produces output equivalent to node.js library (OpenSSL)", () => {
					const NodeCrypto: typeof nodecrypto = require("crypto");

					for (let i = 0; i < 100; i++) {
						const randomKey = JSRandom.getIntegerArray(16, 0, 256);
						const aes = new Crypto.AES(Encoding.Tools.bigEndianByteArrayToIntArray(new Uint8Array(randomKey)));

						const randomPlaintext = JSRandom.getIntegerArray(16, 0, 256);
						const randomPlaintextAs32BitArray = Encoding.Tools.bigEndianByteArrayToIntArray(new Uint8Array(randomPlaintext));
						const jsCiphertext = Encoding.Tools.intArrayToBigEndianByteArray(aes.encryptBlock(randomPlaintextAs32BitArray));

						// Encryption
						const openSSLCipher = NodeCrypto.createCipheriv("aes-128-ecb", new Buffer(randomKey), new Buffer([]));
						openSSLCipher.setAutoPadding(false);
						const openSSLCipherText = openSSLCipher.update(new Buffer(randomPlaintext));

						expect(ArrayTools.compareArraysAndLog(jsCiphertext, openSSLCipherText)).toBe(true);
					}
				});
			}
		});

		if (runningInNodeJS()) {
			describe("AES_CTR_JS:", () => {

				it("Produces output equivalent to node.js library (OpenSSL) and decodes it correctly", () => {
					for (let i = 0; i < 1; i++) {
						const plaintext = Crypto.Random.getBytes(JSRandom.getIntegerInRange(0, 256));

						const keyBytes = Crypto.Random.getBytes(16);
						const key = Encoding.Tools.bigEndianByteArrayToIntArray(keyBytes);
						const nonceBytes = Crypto.Random.getBytes(16);
						const nonce = Encoding.Tools.bigEndianByteArrayToIntArray(nonceBytes);

						const aesStream = new Crypto.AES_CTR_JS(new Crypto.AES(key), nonce, i);
						const jsCiphertext = new Uint8Array(plaintext.length);
						aesStream.transformBytes(plaintext, 0, jsCiphertext, 0, plaintext.length);


						// Encryption
						const nodeAES_CTR = new Crypto.AES_CTR_Node(key, nonce, i);
						const nodeCiphertext = new Uint8Array(plaintext.length);
						nodeAES_CTR.transformBytes(plaintext, 0, nodeCiphertext, 0, plaintext.length);

						expect(ArrayTools.compareArraysAndLog(jsCiphertext, nodeCiphertext)).toBe(true);

						// Decryption
						aesStream.reset(nonce, i);
						const decryptedBytes = new Uint8Array(jsCiphertext.length);
						aesStream.transformBytes(jsCiphertext, 0, decryptedBytes, 0, jsCiphertext.length);
						expect(ArrayTools.compareArraysAndLog(decryptedBytes, plaintext)).toBe(true);
					}
				});
			});
		}

		if (runningInNodeJS()) {
			describe("AES_CBC_JS:", () => {

				it("Produces output equivalent to node.js library (OpenSSL) and decodes it correctly (no padding)", () => {
					const NodeCrypto: typeof nodecrypto = require("crypto");

					for (let i = 0; i < 1024; i += 16) {
						const plaintext = Crypto.Random.getBytes(JSRandom.getIntegerInRange(0, 100) * 16)

						const keyBytes = Crypto.Random.getBytes(16);
						const keyHex = Encoding.Hex.encode(keyBytes);
						let iv = Crypto.Random.getBytes(16);

						// Encryption
						const jsCiphertext = Crypto.AES_CBC_JS.encryptWithoutPadding(plaintext, keyHex, iv);

						const nodeAES_CBC_Encryptor = NodeCrypto.createCipheriv("aes-128-cbc", new Buffer(keyBytes), new Buffer(iv));
						nodeAES_CBC_Encryptor.setAutoPadding(false);

						const nodeCiphertext = Buffer.concat([<any>nodeAES_CBC_Encryptor.update(new Buffer(plaintext)), <any>nodeAES_CBC_Encryptor.final()]);

						expect(ArrayTools.compareArraysAndLog(jsCiphertext, nodeCiphertext)).toBe(true);

						// Decryption
						const jsDeciphertext = Crypto.AES_CBC_JS.decryptWithoutPadding(jsCiphertext, keyHex, iv);

						const nodeAES_CBC_Decryptor = NodeCrypto.createDecipheriv("aes-128-cbc", new Buffer(keyBytes), new Buffer(iv));
						nodeAES_CBC_Decryptor.setAutoPadding(false);

						const nodeDeciphertext = Buffer.concat([<any>nodeAES_CBC_Decryptor.update(nodeCiphertext), <any>nodeAES_CBC_Decryptor.final()]);

						expect(ArrayTools.compareArraysAndLog(jsDeciphertext, nodeDeciphertext)).toBe(true);
					}
				});

				it("Produces output equivalent to node.js library (OpenSSL) and decodes it correctly (PKCS#7 padding)", () => {
					const NodeCrypto: typeof nodecrypto = require("crypto");

					for (let i = 0; i < 1024; i++) {
						const plaintext = Crypto.Random.getBytes(JSRandom.getIntegerInRange(0, 1024));

						const keyBytes = Crypto.Random.getBytes(16);
						const keyHex = Encoding.Hex.encode(keyBytes);
						let iv = Crypto.Random.getBytes(16);

						//// Encryption

						// JS
						const jsCiphertext = Crypto.AES_CBC_JS.encrypt(plaintext, keyHex, iv);

						// Node
						const nodeAES_CBC_Encryptor = NodeCrypto.createCipheriv("aes-128-cbc", new Buffer(keyBytes), new Buffer(iv));
						nodeAES_CBC_Encryptor.setAutoPadding(true);
						const nodeCiphertext = Buffer.concat([<any>nodeAES_CBC_Encryptor.update(new Buffer(plaintext)), <any>nodeAES_CBC_Encryptor.final()]);

						// Test
						expect(ArrayTools.compareArraysAndLog(jsCiphertext, nodeCiphertext)).toBe(true);

						//// Decryption

						// JS
						const jsDeciphertext = Crypto.AES_CBC_JS.decrypt(jsCiphertext, keyHex, iv);

						// Node
						const nodeAES_CBC_Decryptor = NodeCrypto.createDecipheriv("aes-128-cbc", new Buffer(keyBytes), new Buffer(iv));
						nodeAES_CBC_Decryptor.setAutoPadding(true);
						const nodeDeciphertext = Buffer.concat([<any>nodeAES_CBC_Decryptor.update(nodeCiphertext), <any>nodeAES_CBC_Decryptor.final()]);

						// Test
						expect(ArrayTools.compareArraysAndLog(jsDeciphertext, nodeDeciphertext)).toBe(true);
					}
				});
			});
		}

		describe("AES_CBC:", () => {
			it("Encrypts a random test case correctly", () => {
				const keyHex = Encoding.Hex.encode(Crypto.Random.getBytes(16));
				let iv = Crypto.Random.getBytes(16);
				const plaintext = Crypto.Random.getBytes(221);
				const expectedCiphertext = Crypto.AES_CBC_JS.encrypt(plaintext, keyHex, iv);

				return Crypto.AES_CBC.encryptAsync(plaintext, keyHex, iv)
					.then((result) => {
						expect(ArrayTools.compareArraysAndLog(result, expectedCiphertext)).toBe(true);
					})
			})

			it("Decrypts a random test case correctly", () => {
				const keyHex = Encoding.Hex.encode(Crypto.Random.getBytes(16));
				let iv = Crypto.Random.getBytes(16);
				const expectedPlaintext = Crypto.Random.getBytes(221);
				const ciphertext = Crypto.AES_CBC_JS.encrypt(expectedPlaintext, keyHex, iv);

				Crypto.AES_CBC.decryptAsync(ciphertext, keyHex, iv)
					.then((result) => {
						expect(ArrayTools.compareArraysAndLog(result, expectedPlaintext)).toBe(true);
					})
			})
		});

		describe("SHA1:", () => {
			it("Hashes an empty string", () => {
				expect(Crypto.SHA1.hashStringToHex("")).toEqual("da39a3ee5e6b4b0d3255bfef95601890afd80709");
			});

			it("Hashes 'The quick brown fox jumps over the lazy dog'", () => {
				expect(Crypto.SHA1.hashStringToHex("The quick brown fox jumps over the lazy dog")).toEqual("2fd4e1c67a2d28fced849ee1bb76e7391b93eb12");
			});

			it("Hashes 'abcdefghijklmnopqrstuvwxyz'", () => {
				expect(Crypto.SHA1.hashStringToHex("abcdefghijklmnopqrstuvwxyz")).toEqual("32d10c7b8cf96570ca04ce37f2a19d84240d3a89");
			});

			if (runningInNodeJS()) {
				it("Produces output equivalent to node.js library (OpenSSL)", () => {
					for (let i = 0; i < 100; i++) {
						const randomPlaintext = new Uint8Array(JSRandom.getIntegerArray(i, 0, 256));
						const jsHash = Crypto.SHA1.hashUsingJS(randomPlaintext);
						const nodeHash = Crypto.SHA1.hashUsingNode(BufferTools.uint8ArrayToBuffer(randomPlaintext));

						expect(ArrayTools.compareArraysAndLog(jsHash, nodeHash)).toBe(true);
					}
				});
			}
		});

		describe("Random:", () => {
			it("Produces a correct number of bytes", () => {
				const randomBytes = Crypto.Random.getBytes(59);

				expect(randomBytes).not.toBeNull();
				expect(randomBytes).not.toBeUndefined();
				expect(randomBytes.length).toEqual(59);
			});

			it("Produces values cummulatively averaging around 127.5", () => {
				const byteCount = 10000;
				const randomBytes = Crypto.Random.getBytes(byteCount);
				let sum = 0;

				for (let i = 0; i < byteCount; i++) {
					sum += randomBytes[i];
				}

				const meanValue = sum / byteCount;
				//console.log(meanValue);
				expect(meanValue).toBeGreaterThan(127.5 - 4);
				expect(meanValue).toBeLessThan(127.5 + 4);
			});

			it("Produces a string with a correct number of string characters", () => {
				const randomString = Crypto.Random.getBytes(59);

				expect(typeof randomString == "string");
				expect(randomString).not.toBeNull();
				expect(randomString).not.toBeUndefined();
				expect(randomString.length).toEqual(59);
			});

			it("Produces a Uint32", () => {
				const randomUint32 = Crypto.Random.getUint32();

				expect(typeof randomUint32 == "number");
				expect(randomUint32).not.toBeNull();
				expect(randomUint32).not.toBeUndefined();
			});

			it("Returns a large amount (1MB) of random data", () => {
				const randomBytes = Crypto.Random.getBytes(1000000);

				expect(randomBytes).not.toBeNull();
				expect(randomBytes).not.toBeUndefined();
				expect(randomBytes.length).toEqual(1000000);
			});
		});
	});
}