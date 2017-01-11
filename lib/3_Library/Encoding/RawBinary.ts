namespace ZincDB {
	export namespace Encoding {
		export namespace RawBinaryString {
			export const encode = function(str: string): Uint8Array {
				if (runningInNodeJS()) {
					return BufferTools.bufferToUint8Array(new Buffer(str, "binary"));
				}
				else {
					return encodeWithJS(str);
				}
			}

			export const decode = function(rawBinaryBytes: Uint8Array): string {
				if (runningInNodeJS()) {
					return (BufferTools.uint8ArrayToBuffer(rawBinaryBytes)).toString("binary");
				}
				else {
					return decodeWithJS(rawBinaryBytes);
				}
			}

			export const encodeWithJS = function(str: string): Uint8Array {
				const result = new Uint8Array(str.length);

				for (let i = 0, length = str.length; i < length; i++)
					result[i] = str.charCodeAt(i);

				return result;
			}

			export const decodeWithJS = function(rawBinaryBytes: Uint8Array): string {
				const result = new StringBuilder();

				for (let i = 0, length = rawBinaryBytes.length; i < length; i++)
					result.appendCharCode(rawBinaryBytes[i]);

				return result.getOutputString();
			}
		}
	}
}