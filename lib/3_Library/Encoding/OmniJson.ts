namespace ZincDB {
	export namespace Encoding {
		export namespace OmniJson {
			/*
				(For future enhancements - structured clone reference: 
				    https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)
			
				Encoding type identifiers:
				00: Text

				01: Uint8Array as Base64
				02: Int8Array as Base64
				03: Uint16Array as Base64
				04: Int16Array as Base64
				05: Uint32Array as Base64
				06: Int32Array as Base64
				07: Float32Array as Base64
				08: Float64Array as Base64
				09: Uint8ClampedArray as Base64
				10: ArrayBuffer as Base64

				11: Date as string containing millisecond UNIX timestamp
				12: RegExp
			*/
			export const encode = function (input: any): string {
				if (input === undefined)
					return "";

				// This workaround is required for Dates to be correctly processed:
				const oldDateToJSON = Date.prototype.toJSON;
				Date.prototype.toJSON = <any>undefined;
				//

				const result = JSON.stringify(input, (key, value) => {
					if (value == null)
						return value;

					const typeofValue = typeof value;

					if (typeofValue === "string")
						return "00" + value;

					if (typeofValue !== "object")
						return value;

					const valueAsTypedArrayToBase64 = (): string =>
						Base64.encode(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));

					const prototypeIdentifier = Object.prototype.toString.call(value);

					switch (prototypeIdentifier) {
						case "[object Uint8Array]":
							return "01" + Base64.encode(value);
						case "[object Int8Array]":
							return "02" + valueAsTypedArrayToBase64();
						case "[object Uint16Array]":
							return "03" + valueAsTypedArrayToBase64();
						case "[object Int16Array]":
							return "04" + valueAsTypedArrayToBase64();
						case "[object Uint32Array]":
							return "05" + valueAsTypedArrayToBase64();
						case "[object Int32Array]":
							return "06" + valueAsTypedArrayToBase64();
						case "[object Float32Array]":
							return "07" + valueAsTypedArrayToBase64();
						case "[object Float64Array]":
							return "08" + valueAsTypedArrayToBase64();
						case "[object Uint8ClampedArray]":
							return "09" + valueAsTypedArrayToBase64();
						case "[object ArrayBuffer]":
							return "10" + Base64.encode(new Uint8Array(value));

						case "[object Date]":
							return "11" + JSON.stringify(value.valueOf());
						case "[object RegExp]":
							return "12" + RegExpString.encode(value);
						default:
							return value;
					}
				});

				// Restore Date.toJSON
				Date.prototype.toJSON = oldDateToJSON;
				//

				return result;
			}

			export const decode = function (input: string): any {
				if (typeof input !== "string")
					throw new TypeError("Given input is not a string");

				if (input === "")
					return undefined;

				return JSON.parse(input, (key, value) => {
					if (typeof value !== "string")
						return value;

					const encodingType = value.substring(0, 2);
					const str = value.substring(2);

					const decodeAsBase64ToArrayBuffer = () => {
						const bytes = Base64.decode(str);

						// Handle the case Base64.decode gives out a subarray of some sort
						if (bytes.length !== bytes.buffer.byteLength) {
							const clone = new Uint8Array(bytes.length);
							clone.set(bytes);
							return clone.buffer;
						} else {
							return bytes.buffer;
						}
					}

					switch (encodingType) {
						// Plain string
						case "00": // Text
							return str;

						// Typed Arrays:
						case "01": // Uint8Array as Base64
							return Base64.decode(str);
						case "02": // Int8Array as Base64
							return new Int8Array(decodeAsBase64ToArrayBuffer());
						case "03": // Uint16Array as Base64
							return new Uint16Array(decodeAsBase64ToArrayBuffer());
						case "04": // Int16Array as Base64
							return new Int16Array(decodeAsBase64ToArrayBuffer());
						case "05": // Uint32Array as Base64
							return new Uint32Array(decodeAsBase64ToArrayBuffer());
						case "06": // Int32Array as Base64
							return new Int32Array(decodeAsBase64ToArrayBuffer());
						case "07": // Float32Array as Base64
							return new Float32Array(decodeAsBase64ToArrayBuffer());
						case "08": // Float64Array as Base64
							return new Float64Array(decodeAsBase64ToArrayBuffer());
						case "09": // Uint8ClampedArray as Base64
							return new Uint8ClampedArray(decodeAsBase64ToArrayBuffer());
						case "10": // ArrayBuffer as Base64
							return decodeAsBase64ToArrayBuffer();

						// Misc objects:
						case "11": // Date
							return new Date(JSON.parse(str));
						case "12": // RegExp
							return RegExpString.decode(str);

						default:
							throw new TypeError(`An unsupported encoding identifier '${encodingType}' was encountered in the string '${input}'.`);
					}
				});
			}
		}
	}
}