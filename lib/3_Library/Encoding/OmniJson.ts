namespace ZincDB {
	export namespace Encoding {
		export namespace OmniJson {
			/*
				(For future enhancements - structured clone reference: 
				    https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)
			
				Encoding type identifiers:
				1: Int8Array as Base64
				2: Uint8Array as Base64
				3: Uint8ClampedArray as Base64
				4: Int16Array as Base64
				5: Uint16Array as Base64
				6: Int32Array as Base64
				7: Uint32Array as Base64
				8: Float32Array as Base64
				9: Float64Array as Base64

				A: ArrayBuffer as Base64
				B: Blob as Base64 (future)
				C: (unused)
				D: Date as string containing millisecond UNIX timestamp
				R: RegExp

				T: Text
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
						return "T" + value;

					if (typeofValue !== "object")
						return value;

					const valueAsTypedArrayToBase64 = (): string =>
						Base64.encode(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));

					const prototypeIdentifier = Object.prototype.toString.call(value);

					switch (prototypeIdentifier) {
						case "[object Int8Array]":
							return "1" + valueAsTypedArrayToBase64();						
						case "[object Uint8Array]":
							return "2" + Base64.encode(value);
						case "[object Uint8ClampedArray]":
							return "3" + valueAsTypedArrayToBase64();							
						case "[object Int16Array]":
							return "4" + valueAsTypedArrayToBase64();
						case "[object Uint16Array]":
							return "5" + valueAsTypedArrayToBase64();
						case "[object Int32Array]":
							return "6" + valueAsTypedArrayToBase64();
						case "[object Uint32Array]":
							return "7" + valueAsTypedArrayToBase64();
						case "[object Float32Array]":
							return "8" + valueAsTypedArrayToBase64();
						case "[object Float64Array]":
							return "9" + valueAsTypedArrayToBase64();
						case "[object ArrayBuffer]":
							return "A" + Base64.encode(new Uint8Array(value));

						case "[object Date]":
							return "D" + JSON.stringify(value.valueOf());
						case "[object RegExp]":
							return "R" + RegExpString.encode(value);

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

					const typeSignifier = value[0];
					const payload = value.substring(1);

					const decodeAsBase64ToArrayBuffer = () => {
						const bytes = Base64.decode(payload);

						// Handle the case Base64.decode gives out a subarray of some sort
						if (bytes.length !== bytes.buffer.byteLength) {
							const clone = new Uint8Array(bytes.length);
							clone.set(bytes);
							return clone.buffer;
						} else {
							return bytes.buffer;
						}
					}

					switch (typeSignifier) {
						// Plain string
						case "T": // Text
							return payload;

						// Typed Arrays:
						case "1": // Int8Array as Base64
							return new Int8Array(decodeAsBase64ToArrayBuffer());
						case "2": // Uint8Array as Base64
							return Base64.decode(payload);
						case "3": // Uint8ClampedArray as Base64
							return new Uint8ClampedArray(decodeAsBase64ToArrayBuffer());							
						case "4": // Int16Array as Base64
							return new Int16Array(decodeAsBase64ToArrayBuffer());
						case "5": // Uint16Array as Base64
							return new Uint16Array(decodeAsBase64ToArrayBuffer());
						case "6": // Int32Array as Base64
							return new Int32Array(decodeAsBase64ToArrayBuffer());
						case "7": // Uint32Array as Base64
							return new Uint32Array(decodeAsBase64ToArrayBuffer());
						case "8": // Float32Array as Base64
							return new Float32Array(decodeAsBase64ToArrayBuffer());
						case "9": // Float64Array as Base64
							return new Float64Array(decodeAsBase64ToArrayBuffer());
						case "A": // ArrayBuffer as Base64
							return decodeAsBase64ToArrayBuffer();

						// Misc objects:
						case "D": // Date
							return new Date(JSON.parse(payload));
						case "R": // RegExp
							return RegExpString.decode(payload);

						default:
							throw new TypeError(`An unsupported encoding identifier '${typeSignifier}' was encountered in the string '${input}'.`);
					}
				});
			}
		}
	}
}