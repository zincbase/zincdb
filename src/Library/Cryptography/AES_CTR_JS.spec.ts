namespace ZincDB {
	describe("Crypto:", () => {
		describe("AES_CTR_JS:", () => {
			if (runningInNodeJS()) {
				it("Produces output equivalent to node.js library (OpenSSL) and decrypts it correctly", () => {
					const rand = new SeededRandom();

					for (let i = 0; i < 1000; i++) {
						const plaintext = rand.getBytes(i);

						const keyBytes = rand.getBytes(16);
						const key = Encoding.Tools.bigEndianByteArrayToIntArray(keyBytes);
						const nonceBytes = rand.getBytes(16);
						const nonce = Encoding.Tools.bigEndianByteArrayToIntArray(nonceBytes);

						const aesStream = new Crypto.AES_CTR_JS(new Crypto.AES(key), nonce, i);
						const jsCiphertext = new Uint8Array(plaintext.length);
						aesStream.transformBytes(plaintext, 0, jsCiphertext, 0, plaintext.length);

						// Encryption
						const nodeAES_CTR = new Crypto.AES_CTR_Node(key, nonce, i);
						const nodeCiphertext = new Uint8Array(plaintext.length);
						nodeAES_CTR.transformBytes(plaintext, 0, nodeCiphertext, 0, plaintext.length);
						expect(jsCiphertext).toEqual(nodeCiphertext);

						// Decryption
						aesStream.reset(nonce, i);
						const decryptedBytes = new Uint8Array(jsCiphertext.length);
						aesStream.transformBytes(jsCiphertext, 0, decryptedBytes, 0, jsCiphertext.length);

						expect(decryptedBytes).toEqual(plaintext);
					}
				});
			}
		});

	});
}
