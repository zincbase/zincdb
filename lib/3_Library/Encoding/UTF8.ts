namespace ZincDB {
	export namespace Encoding {
		export namespace UTF8 {
			declare const TextEncoder: any;
			declare const TextDecoder: any;			
			let nativeTextEncoder: any;
			let nativeTextDecoder: any;

			export const encode = function(str: string): Uint8Array {
				if (!str || str.length == 0)
					return new Uint8Array(0);

				if (runningInNodeJS()) {
					return BufferTools.bufferToUint8Array(new Buffer(str, "utf8"));
				}
				else if (createNativeTextEncoderAndDecoderIfAvailable()) {
					return nativeTextEncoder.encode(str);
				}
				else {
					return encodeWithJS(str);
				}
			}

			export const decode = function(utf8Bytes: Uint8Array): string {
				if (!utf8Bytes || utf8Bytes.length == 0)
					return "";

				if (runningInNodeJS()) {
					return BufferTools.uint8ArrayToBuffer(utf8Bytes).toString("utf8");
				}
				else if (createNativeTextEncoderAndDecoderIfAvailable()) {
					return nativeTextDecoder.decode(utf8Bytes);
				}
				else {
					return decodeWithJS(utf8Bytes);
				}
			}

			export const encodeWithJS = function(str: string, outputArray?: Uint8Array): Uint8Array {
				if (!str || str.length == 0)
					return new Uint8Array(0);

				if (!outputArray)
					outputArray = new Uint8Array(str.length * 4);

				let writeIndex = 0;

				for (let readIndex = 0; readIndex < str.length; readIndex++) {
					const charCode = getUnicodeCodePoint(str, readIndex);

					if (charCode <= 0x7F)
					{
						outputArray[writeIndex++] = charCode;
					}
					else if (charCode <= 0x7FF)
					{
						outputArray[writeIndex++] = 192 | (charCode >>> 6);
						outputArray[writeIndex++] = 128 | (charCode & 63);
					}
					else if (charCode <= 0xFFFF)
					{
						outputArray[writeIndex++] = 224 | (charCode >>> 12);
						outputArray[writeIndex++] = 128 | ((charCode >>> 6) & 63);
						outputArray[writeIndex++] = 128 | (charCode & 63);
					}
					else if (charCode <= 0x10FFFF)
					{
						outputArray[writeIndex++] = 240 | (charCode >>> 18);
						outputArray[writeIndex++] = 128 | ((charCode >>> 12) & 63);
						outputArray[writeIndex++] = 128 | ((charCode >>> 6) & 63);
						outputArray[writeIndex++] = 128 | (charCode & 63);

						readIndex++; // A character outside the BMP had to be made from two surrogate characters
					}
					else
						throw new Error("Invalid UTF-16 string: Encountered a character unsupported by UTF-8/16 (RFC 3629)");
				}

				return outputArray.subarray(0, writeIndex);
			}

			export const decodeWithJS = function(utf8Bytes: Uint8Array, startOffset = 0, endOffset?: number): string {
				if (!utf8Bytes || utf8Bytes.length == 0)
					return "";

				if (endOffset === undefined)
					endOffset = utf8Bytes.length;

				const output = new StringBuilder();

				let outputCodePoint: number;
				let leadByte: number;

				for (let readIndex = startOffset, length = endOffset; readIndex < length;) {
					leadByte = utf8Bytes[readIndex];

					if ((leadByte >>> 7) === 0) {
						outputCodePoint = leadByte;
						readIndex += 1;
					}
					else if ((leadByte >>> 5) === 6) {
						if (readIndex + 1 >= endOffset)
							throw new Error("Invalid UTF-8 stream: Truncated codepoint sequence encountered at position " + readIndex);

						outputCodePoint = ((leadByte & 31) << 6) | (utf8Bytes[readIndex + 1] & 63);
						readIndex += 2;
					}
					else if ((leadByte >>> 4) === 14) {
						if (readIndex + 2 >= endOffset)
							throw new Error("Invalid UTF-8 stream: Truncated codepoint sequence encountered at position " + readIndex);

						outputCodePoint = ((leadByte & 15) << 12) | ((utf8Bytes[readIndex + 1] & 63) << 6) | (utf8Bytes[readIndex + 2] & 63);
						readIndex += 3;
					}
					else if ((leadByte >>> 3) === 30) {
						if (readIndex + 3 >= endOffset)
							throw new Error("Invalid UTF-8 stream: Truncated codepoint sequence encountered at position " + readIndex);

						outputCodePoint = ((leadByte & 7) << 18) | ((utf8Bytes[readIndex + 1] & 63) << 12) | ((utf8Bytes[readIndex + 2] & 63) << 6) | (utf8Bytes[readIndex + 3] & 63);
						readIndex += 4;
					}
					else
						throw new Error("Invalid UTF-8 stream: An invalid lead byte value encountered at position " + readIndex);

					output.appendCodePoint(outputCodePoint);
				}

				return output.getOutputString();
			}

			export const getUnicodeCodePoint = function(str: string, position: number): number {
				const charCode = str.charCodeAt(position);

				if (charCode < 0xD800 || charCode > 0xDBFF)
					return charCode;
				else {
					const nextCharCode = str.charCodeAt(position + 1);

					if (nextCharCode >= 0xDC00 && nextCharCode <= 0xDFFF)
						return 0x10000 + (((charCode - 0xD800) << 10) + (nextCharCode - 0xDC00));
					else
						throw new Error("getUnicodeCodePoint: Received a lead surrogate character not followed by a trailing one");
				}
			}

			export const getStringFromUnicodeCodePoint = function(codePoint: number): string {
				if (codePoint <= 0xFFFF)
					return String.fromCharCode(codePoint);
				else if (codePoint <= 0x10FFFF)
					return String.fromCharCode(
						0xD800 + ((codePoint - 0x10000) >>> 10),
						0xDC00 + ((codePoint - 0x10000) & 1023));
				else
					throw new Error("getStringFromUnicodeCodePoint: A code point of " + codePoint + " cannot be encoded in UTF-16");
			}

			export const createNativeTextEncoderAndDecoderIfAvailable = function(): boolean {
				if (nativeTextEncoder)
					return true;

				if (typeof TextEncoder == "function") {
					nativeTextEncoder = new TextEncoder("utf-8");
					nativeTextDecoder = new TextDecoder("utf-8");

					return true;
				}
				else
					return false;
			}
		}
	}
} 