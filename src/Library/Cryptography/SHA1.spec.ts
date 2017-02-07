namespace ZincDB {
	describe("Crypto:", () => {
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
					const rand = new SeededRandom();

					for (let i = 0; i < 100; i++) {
						const randomPlaintext = rand.getBytes(i);
						const jsHash = Crypto.SHA1.hashUsingJS(randomPlaintext);
						const nodeHash = Crypto.SHA1.hashUsingNode(BufferTools.uint8ArrayToBuffer(randomPlaintext));

						expect(jsHash).toEqual(nodeHash);
					}
				});
			}
		});
	});
}
