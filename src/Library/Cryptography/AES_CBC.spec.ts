namespace ZincDB {
	describe("Crypto:", () => {
		describe("AES_CBC:", () => {
			if (runningInNodeJS()) {
				const NodeCrypto: typeof nodecrypto = require("crypto");

				it("Produces output equivalent to node.js library (OpenSSL) and decodes it correctly (no padding)", () => {
					const rand = new SeededRandom();

					for (let i = 0; i < 16 * 100; i += 16) {
						const plaintext = rand.getBytes(i)

						const keyBytes = rand.getBytes(16);
						const keyHex = Encoding.Hex.encode(keyBytes);
						let iv = rand.getBytes(16);

						// Encryption:
						// Get reference result
						const nodeCipher = NodeCrypto.createCipheriv("aes-128-cbc", new Buffer(keyHex, "hex"), BufferTools.uint8ArrayToBuffer(iv));
						nodeCipher.setAutoPadding(false);
						const referenceCiphertext = BufferTools.bufferToUint8Array(Buffer.concat([nodeCipher.update(BufferTools.uint8ArrayToBuffer(plaintext)), nodeCipher.final()]));

						// Compare results to reference
						expect(Crypto.AES_CBC_JS.encryptWithoutPadding(plaintext, keyHex, iv)).toEqual(referenceCiphertext);
						expect(Crypto.AES_CBC_Node.encryptWithoutPadding(plaintext, keyHex, iv)).toEqual(referenceCiphertext);

						// Decryption:
						// Compare results to plaintext
						expect(Crypto.AES_CBC_JS.decryptWithoutPadding(referenceCiphertext, keyHex, iv)).toEqual(plaintext);
						expect(Crypto.AES_CBC_Node.decryptWithoutPadding(referenceCiphertext, keyHex, iv)).toEqual(plaintext);
					}
				});

				it("Produces output equivalent to node.js library (OpenSSL) and decodes it correctly (with PKCS#7 padding)", () => {
					const rand = new SeededRandom();

					for (let i = 0; i < 100; i++) {
						const plaintext = rand.getBytes(i)

						const keyBytes = rand.getBytes(16);
						const keyHex = Encoding.Hex.encode(keyBytes);
						let iv = rand.getBytes(16);

						// Encryption:
						// Get reference ciphertext
						const nodeCipher = NodeCrypto.createCipheriv("aes-128-cbc", new Buffer(keyHex, "hex"), BufferTools.uint8ArrayToBuffer(iv));
						nodeCipher.setAutoPadding(true);
						const referenceCiphertext = BufferTools.bufferToUint8Array(Buffer.concat([nodeCipher.update(BufferTools.uint8ArrayToBuffer(plaintext)), nodeCipher.final()]));

						// Compare results to reference
						expect(Crypto.AES_CBC.encrypt(plaintext, keyHex, iv)).toEqual(referenceCiphertext);
						expect(Crypto.AES_CBC.encryptUsingJS(plaintext, keyHex, iv)).toEqual(referenceCiphertext);
						expect(Crypto.AES_CBC.encryptUsingNode_1(plaintext, keyHex, iv)).toEqual(referenceCiphertext);
						expect(Crypto.AES_CBC.encryptUsingNode_2(plaintext, keyHex, iv)).toEqual(referenceCiphertext);

						// Decryption:
						// Compare results to plaintext
						expect(Crypto.AES_CBC.decrypt(referenceCiphertext, keyHex, iv)).toEqual(plaintext);
						expect(Crypto.AES_CBC.decryptUsingJS(referenceCiphertext, keyHex, iv)).toEqual(plaintext);
						expect(Crypto.AES_CBC.decryptUsingNode_1(referenceCiphertext, keyHex, iv)).toEqual(plaintext);
						expect(Crypto.AES_CBC.decryptUsingNode_2(referenceCiphertext, keyHex, iv)).toEqual(plaintext);
					}
				});
			}

			it("Produces equivalent output in async JS and WebCrypto implementations", async () => {
				const webCryptoAvailable = await Crypto.webCryptoAvailable();

				if (!webCryptoAvailable)
					return;

				const rand = new SeededRandom();

				// Note: passing a 0 length plaintext array to WebCrypto breaks Edge with an
				// unexpected 8070000b error
				for (let i = 1; i < 50; i++) {
					const plaintext = rand.getBytes(i)

					const keyBytes = rand.getBytes(16);
					const keyHex = Encoding.Hex.encode(keyBytes);
					let iv = rand.getBytes(16);

					// Encryption:
					// Get reference ciphertext
					const referenceCiphertext = Crypto.AES_CBC.encryptUsingJS(plaintext, keyHex, iv)

					// Compare results to reference
					expect(await Crypto.AES_CBC.encryptAsync(plaintext, keyHex, iv)).toEqual(referenceCiphertext);
					expect(await Crypto.AES_CBC.encryptAsyncUsingJS(plaintext, keyHex, iv)).toEqual(referenceCiphertext);
					expect(await Crypto.AES_CBC.encryptAsyncUsingWebCrypto(plaintext, keyHex, iv)).toEqual(referenceCiphertext);

					// Decryption:
					// Compare results to plaintext
					expect(await Crypto.AES_CBC.decryptAsync(referenceCiphertext, keyHex, iv)).toEqual(plaintext);
					expect(await Crypto.AES_CBC.decryptAsyncUsingJS(referenceCiphertext, keyHex, iv)).toEqual(plaintext);
					expect(await Crypto.AES_CBC.decryptAsyncUsingWebCrypto(referenceCiphertext, keyHex, iv)).toEqual(plaintext);
				}
			});
		});
	});
}
