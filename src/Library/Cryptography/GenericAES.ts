// NOTE: this is untested code, it may not work at all

namespace ZincDB {
	export namespace Crypto {
		export namespace GenericAES {
			export interface GenericAESCipherInstance {
				key: number[];
				encryptByteBlock: (input: Uint8Array, output?: Uint8Array) => Uint8Array
				decryptByteBlock: (input: Uint8Array, output?: Uint8Array) => Uint8Array
			}

			if (runningInNodeJS())
				var NodeCrypto: typeof nodecrypto = require("crypto");

			const cache: GenericAESCipherInstance[] = [];

			export const fromCache = function (key: number[]): GenericAESCipherInstance {
				for (let i = 0; i < cache.length; i++) {
					const member = cache[i];

					if (member.key[0] === key[0] &&
						member.key[1] === key[1] &&
						member.key[2] === key[2] &&
						member.key[3] === key[3]) {
						return member;
					}
				}

				let newObject: GenericAESCipherInstance;

				if (runningInNodeJS()) {
					const encryptionObject = NodeCrypto.createCipher("aes-128-ecb", Encoding.Tools.intArrayToBigEndianByteArray(key));
					const decryptionObject = NodeCrypto.createDecipher("aes-128-ecb", Encoding.Tools.intArrayToBigEndianByteArray(key));

					newObject =
						{
							key: key,
							encryptByteBlock: (input) => BufferTools.bufferToUint8Array(<any>encryptionObject.update(BufferTools.uint8ArrayToBuffer(input))),
							decryptByteBlock: (input) => BufferTools.bufferToUint8Array(<any>decryptionObject.update(BufferTools.uint8ArrayToBuffer(input)))
						};
				}
				else {
					newObject = new AES(key);
				}

				cache.push(newObject);

				return newObject;
			}
		}
	}
}
