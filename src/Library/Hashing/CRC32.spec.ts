namespace ZincDB {
	describe("Hashing:", () => {
		describe("CRC32:", () => {
			it("Calculates CRC32 for Uint8 arrays", () => {
				let checksum = Hashing.CRC32.getChecksum(Encoding.Hex.decode("22404c7bd311a5fd"));
				expect(checksum >>> 0).toEqual(1436274127);

				checksum = Hashing.CRC32.getChecksum(Encoding.Hex.decode("2b7e151628aed2a6abf7158809cf4f3c"));
				expect(checksum >>> 0).toEqual(4142484572);

				checksum = Hashing.CRC32.getChecksum(Encoding.UTF8.encode("The quick brown fox jumps over the lazy dog"));
				expect(checksum >>> 0).toEqual(1095738169);
			});
		});
	});
}
