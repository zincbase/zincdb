namespace ZincDB {
	export namespace Crypto {
		export namespace AESHash {
			export const hash = function(data: Uint8Array): Uint8Array {
				const encryptedData = AES_CBC.encrypt(data, "00000000000000000000000000000000", AES_CBC.zeroBlock);
				return encryptedData.subarray(encryptedData.length - 16);
			}
		}
	}
}