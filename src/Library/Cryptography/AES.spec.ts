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
						const keyBytes = Crypto.Random.getBytes(16);
						const aes = new Crypto.AES(Encoding.Tools.bigEndianByteArrayToIntArray(keyBytes));

						const randomPlaintext = Crypto.Random.getBytes(16);
						const randomPlaintextAs32BitArray = Encoding.Tools.bigEndianByteArrayToIntArray(randomPlaintext);
						const jsCiphertext = Encoding.Tools.intArrayToBigEndianByteArray(aes.encryptBlock(randomPlaintextAs32BitArray));

						// Encryption
						const nodeCipher = NodeCrypto.createCipheriv("aes-128-ecb", new Buffer(keyBytes), new Buffer([]));
						nodeCipher.setAutoPadding(false);
						const nodeCipherText = BufferTools.bufferToUint8Array(nodeCipher.update(new Buffer(randomPlaintext)));

						expect(jsCiphertext).toEqual(nodeCipherText)
					}
				});
			}
		});
	})
}
