namespace ZincDB {
	export namespace Crypto {
		let webCryptoAvailable_Cached: boolean;

		export const webCryptoAvailable = async function (): Promise<boolean> {
			if (webCryptoAvailable_Cached !== undefined)
				return webCryptoAvailable_Cached;

			if (typeof crypto !== "object" ||
				typeof crypto.subtle !== "object" ||
				typeof crypto.subtle.encrypt !== "function" ||
				typeof crypto.subtle.decrypt !== "function") {
				webCryptoAvailable_Cached = false;
				return false;
			}

			try {
				await AES_CBC.getWebCryptoKey("00000000000000000000000000000000");
			} catch (e) {
				webCryptoAvailable_Cached = false;
				return false;
			}

			webCryptoAvailable_Cached = true;
			return true;
		}
	}
}
