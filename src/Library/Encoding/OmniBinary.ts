namespace ZincDB {
	export namespace Encoding {
		export namespace OmniBinary {
			const enum EncodingType { Uint8Array = 0, UTF8 = 1, JSON = 2, OmniJson = 3 };
			
			const encodingIdentifiers: Uint8Array[] = [];
			for (let i = 0; i < 256; i++)
				encodingIdentifiers.push(new Uint8Array([i]));

			export const encode = function (input: any): Uint8Array {
				if (typeof input === "string") {
					return ArrayTools.concatUint8Arrays([encodingIdentifiers[EncodingType.UTF8], UTF8.encode(input)]);
				} else if (input instanceof Uint8Array) {
					return ArrayTools.concatUint8Arrays([encodingIdentifiers[EncodingType.Uint8Array], input]);
				} else {
					return ArrayTools.concatUint8Arrays([encodingIdentifiers[EncodingType.OmniJson], UTF8.encode(OmniJson.encode(input))]);
				}
			}

			export const decode = function (input: Uint8Array): any {
				const encodingType: EncodingType = input[0];
				const payload = input.subarray(1);

				switch (encodingType) {
					case EncodingType.Uint8Array:
						return payload;
					case EncodingType.UTF8:
						return Encoding.UTF8.decode(payload);
					case EncodingType.JSON:
						return Encoding.JsonX.decode(UTF8.decode(payload));
					case EncodingType.OmniJson:
						return OmniJson.decode(UTF8.decode(payload));
					default:
						throw new TypeError(`Encunterened an unsupported input with type identifer ${encodingType}`);
				}
			}
		}
	}
}