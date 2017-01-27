namespace ZincDB {
	export namespace Crypto {
		export namespace AESCache_JS {
			const cache: { [keyHex: string]: AES } = {};

			export const getAES = function(keyHex: string): AES {
				let cachedAESObject = cache[keyHex];

				if (!cachedAESObject) {
					cachedAESObject = new AES(Encoding.Tools.bigEndianByteArrayToIntArray(Encoding.Hex.decode(keyHex)));
					cache[keyHex] = cachedAESObject;
				}

				return cachedAESObject;
			}
		}
	}
}