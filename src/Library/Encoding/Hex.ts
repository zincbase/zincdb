namespace ZincDB {
	export namespace Encoding {
		export namespace Hex {
			const characterCodeMap = new Uint8Array([48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 97, 98, 99, 100, 101, 102]);
			const reverseCharacterCodeMap = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 11, 12, 13, 14, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

			export const encode = function(inputArray: Uint8Array): string {
				if (!inputArray || inputArray.length == 0)
					return "";

				if (runningInNodeJS()) {
					return (BufferTools.uint8ArrayToBuffer(inputArray)).toString("hex");
				}
				else {
					return encodeWithJS(inputArray);
				}
			}

			export const decode = function(hexString: string): Uint8Array {
				if (!hexString || hexString.length == 0)
					return new Uint8Array(0);

				if (runningInNodeJS()) {
					return BufferTools.bufferToUint8Array(new Buffer(hexString, "hex"));
				}
				else {
					return decodeWithJS(hexString);
				}
			}

			export const encodeWithJS = function(inputArray: Uint8Array): string {
				const output = new StringBuilder();

				for (let i = 0, length = inputArray.length; i < length; i++) {
					const byte = inputArray[i];
					output.appendCharCode(characterCodeMap[byte >> 4]);
					output.appendCharCode(characterCodeMap[byte & 15]);
				}

				return output.getOutputString();
			}

			export const decodeWithJS = function(hexString: string): Uint8Array {
				const reverseMap = reverseCharacterCodeMap;

				const output = new Uint8Array(hexString.length / 2);
				let outputPosition = 0;

				for (let i = 0, length = hexString.length; i < length; i += 2) {
					output[outputPosition++] =
						(reverseMap[hexString.charCodeAt(i)] << 4) |
						(reverseMap[hexString.charCodeAt(i + 1)]);
				}

				return output;
			}
		}
	}
} 