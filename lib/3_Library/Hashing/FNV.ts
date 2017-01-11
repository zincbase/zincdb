namespace ZincDB {
	export namespace Hashing {
		export namespace FNV {
			// Based on http://isthe.com/chongo/tech/comp/fnv/
			export const fnv1a = function(bytes: Uint8Array | Buffer): number {
				let hash = 0x811c9dc5;

				for (let i = 0, len = bytes.length; i < len; i++) {
					hash ^= bytes[i];
					hash += (hash << 24) + (hash << 8) + (hash << 7) + (hash << 4) + (hash << 1);
				}

				return hash & 0xffffffff;
			}
		}
	}
}