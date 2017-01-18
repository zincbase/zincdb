namespace ZincDB {
	export namespace Encoding {
		export namespace OmniBinary {
			const enum EncodingIndex { Binary = 0, UTF8 = 1, JSON = 2, Base64 = 3 };

			const encodingIdentifiers = [
				new Uint8Array([66, 82, 65, 87]), // "BRAW"
				new Uint8Array([85, 84, 70, 56]), // "UTF8"
				new Uint8Array([74, 83, 79, 78]), // "JSON"
				new Uint8Array([66, 66, 54, 52]), // "BB64"
			];

			export const encode = function (input: any): Uint8Array {
				if (input instanceof Uint8Array) {
					return ArrayTools.concatUint8Arrays([encodingIdentifiers[EncodingIndex.Binary], input]);
				} else if (typeof input === "string") {
					return ArrayTools.concatUint8Arrays([encodingIdentifiers[EncodingIndex.UTF8], Encoding.UTF8.encode(input)]);
				} else {
					return ArrayTools.concatUint8Arrays([encodingIdentifiers[EncodingIndex.JSON], Encoding.UTF8.encode(ZincDB.Tools.stringifyJSONOrUndefined(input))]);
				}
			}

			export const decode = function (input: Uint8Array): any {
				const payload = input.subarray(4);

				const hasEncoding = (index: EncodingIndex) => {
					const identifierBytes = encodingIdentifiers[index];
					return input[0] === identifierBytes[0] && input[1] === identifierBytes[1] && input[2] === identifierBytes[2] && input[3] === identifierBytes[3];
				}

				if (hasEncoding(EncodingIndex.JSON)) {
					return ZincDB.Tools.parseJSONOrUndefined(Encoding.UTF8.decode(payload));
				} else if (hasEncoding(EncodingIndex.UTF8)) {
					return Encoding.UTF8.decode(payload);
				} else if (hasEncoding(EncodingIndex.Binary)) {
					return payload;
				} else if (hasEncoding(EncodingIndex.Base64)) {
					return Encoding.Base64.decode(Encoding.UTF8.decode(payload));
				} else
					throw new TypeError(`Encunterened an unsupported input with type identifer ${Encoding.UTF8.decode(input.subarray(0, 4))}`);
			}
		}
	}
}