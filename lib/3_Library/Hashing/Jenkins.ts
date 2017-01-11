namespace ZincDB {
	export namespace Hashing {
		export namespace Jenkins {
			export const oneAtATime = function(bytes: Uint8Array): number {
				// Note: may overflow beyond 2^31-1 or -2^31 after addition operations

				//"use asm";
				let hash = 0

				for (let i = 0, length = bytes.length; i < length; ++i) {
					hash = (hash + bytes[i]) | 0;
					hash = (hash + (hash << 10)) | 0;
					hash ^= (hash >>> 6);
				}

				hash = (hash + (hash << 3)) | 0;
				hash ^= (hash >>> 11);
				hash = (hash + (hash << 15)) | 0;

				return hash & 2147483647;
			}

			export const oneAtATimeOfString = function(str: string): number {
				// Note: may overflow beyond 2^31-1 or -2^31 after addition operations

				//"use asm";
				let hash = 0

				for (let i = 0, length = str.length; i < length; i++) {
					const charCode = str.charCodeAt(i);

					if (charCode < 256) {
						hash = (hash + charCode) | 0;
						hash = (hash + (hash << 10)) | 0;
						hash ^= (hash >>> 6);
					}
					else {
						hash = (hash + (charCode >>> 8)) | 0;
						hash = (hash + (hash << 10)) | 0;
						hash ^= (hash >>> 6);

						hash = (hash + (charCode & 255)) | 0;
						hash = (hash + (hash << 10)) | 0;
						hash ^= (hash >>> 6);
					}
				}

				hash = (hash + (hash << 3)) | 0;
				hash ^= (hash >>> 11);
				hash = (hash + (hash << 15)) | 0;

				return hash & 2147483647;
			}
		}
	}
}