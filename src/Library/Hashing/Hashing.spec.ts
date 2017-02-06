namespace ZincDB {
	describe("Hashing:", () => {
		describe("CRC32:", () => {
			it("Calculates CRC32 for Uint8 arrays", () => {
				let checksum = Hashing.CRC32.getChecksum(Encoding.Hex.decodeWithJS("22404c7bd311a5fd"));
				expect(checksum >>> 0).toEqual(1436274127);

				checksum = Hashing.CRC32.getChecksum(Encoding.Hex.decodeWithJS("2b7e151628aed2a6abf7158809cf4f3c"));
				expect(checksum >>> 0).toEqual(4142484572);

				checksum = Hashing.CRC32.getChecksum(Encoding.UTF8.encodeWithJS("The quick brown fox jumps over the lazy dog"));
				expect(checksum >>> 0).toEqual(1095738169);
			});
		});

		describe("CRC32C:", () => {
			it("Calculates CRC32C for Uint8 arrays", () => {
				const test = (values: number[], expectedChecksum: number) => {
					const checksum = Hashing.CRC32C.getChecksum(new Uint8Array(values));
					expect(checksum >>> 0).toEqual(expectedChecksum);
				}

				test([], 0);
				test([0x61], 0xc1d04330);
				test([0x66, 0x6f, 0x6f], 0xcfc4ae1d);
				test([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64], 0xc99465aa);
				test([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x20], 0x7e627e58);
				test([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
					0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
					0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
					0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], 0x8a9136aa);
				test([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
					0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
					0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
					0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff], 0x62a8ab43);
				test([0x1f, 0x1e, 0x1d, 0x1c, 0x1b, 0x1a, 0x19, 0x18,
					0x17, 0x16, 0x15, 0x14, 0x13, 0x12, 0x11, 0x10,
					0x0f, 0x0e, 0x0d, 0x0c, 0x0b, 0x0a, 0x09, 0x08,
					0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01, 0x00], 0x113fdb5c);
			});

			it("Supports partial checksums for CRC32C", () => {
				const partialChecksum = Hashing.CRC32C.getChecksum(new Uint8Array([0x68, 0x65, 0x6c]));
				const finalChecksum = Hashing.CRC32C.getChecksum(new Uint8Array([0x6c, 0x6f, 0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64]), undefined, undefined, partialChecksum);
				expect(finalChecksum >>> 0).toEqual(0xc99465aa);
			});
		});

		describe("JenkinsOneAtATime:", () => {
			it("Hashes a test vector", () => {
				const testVector = new Uint8Array([60, 37, 195, 115, 48, 116, 127, 76, 203, 58, 18, 167, 162, 165, 96, 168, 29, 152, 97, 13, 220, 17, 203, 41, 213, 134, 36, 67, 245, 88, 197, 238, 204, 222, 154, 254, 219, 46, 128, 103, 200, 186, 62, 82, 143, 189, 133, 44, 241, 193, 115, 112, 99, 155, 66, 223, 193, 165, 122, 171, 72, 97, 247, 53, 120, 95, 111, 214, 169, 229, 115, 198, 55, 59, 54, 197, 221, 3, 199, 143, 64, 46, 130, 234, 22, 147, 119, 138, 177, 48, 126, 130, 51, 81, 163, 59, 98, 198, 141, 205, 73, 135, 215, 12, 20, 118, 171, 227, 22, 173, 213, 144, 52, 55, 210, 43, 46, 125, 69, 230, 219, 181, 171, 122, 167, 48, 207, 123, 118, 238, 241, 3, 228, 63, 237, 16, 188, 185, 144, 189, 12, 106, 206, 112, 180, 251, 88, 33, 184, 172, 85, 181, 204, 198, 185, 117, 58, 228, 215, 78, 44, 48, 77, 44, 51, 144, 248, 237, 254, 106, 63, 32, 171, 182, 170, 12, 4, 111, 117, 202, 139, 245, 206, 129, 29, 87, 113, 232, 202, 254, 200, 218, 245, 5, 10, 24, 82, 207, 143, 84, 224, 161, 12, 45, 176, 160, 181, 100, 244, 241, 246, 205, 73, 17, 230, 123, 172, 87, 46, 145, 15, 45, 52, 202, 6, 40, 145, 179, 216, 73, 166, 85, 190, 150, 212, 220, 182, 78, 146, 118, 35, 4, 175, 28, 197, 187, 145, 30, 109, 205, 89, 184, 237, 173, 237, 10]);
				expect(Hashing.Jenkins.oneAtATime(testVector)).toEqual(1351321382);
			});
		});
	});
}