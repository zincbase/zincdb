namespace ZincDB {
	export namespace Encoding {
		export namespace OmniBinary {
			const enum SerializedValueType { Binary = 0, UTF8 = 1, JSON = 2 };
			const encodingIdentifiers = [
				new Uint8Array([SerializedValueType.Binary]),
				new Uint8Array([SerializedValueType.UTF8]),
				new Uint8Array([SerializedValueType.JSON])
			];

			export const encode = function (input: any): Uint8Array {
				if (input instanceof Uint8Array) {
					return ArrayTools.concatUint8Arrays([encodingIdentifiers[SerializedValueType.Binary], input]);
				} else if (typeof input === "string") {
					return ArrayTools.concatUint8Arrays([encodingIdentifiers[SerializedValueType.UTF8], Encoding.UTF8.encode(input)]);
				} else {
					return ArrayTools.concatUint8Arrays([encodingIdentifiers[SerializedValueType.JSON], Encoding.UTF8.encode(ZincDB.Tools.stringifyJSONOrUndefined(input))]);
				}
			}

			export const decode = function (input: Uint8Array): any {
				const format: SerializedValueType = input[0];
				const payload = input.subarray(1);

				if (format === SerializedValueType.Binary) {
					return payload;
				} else if (format === SerializedValueType.UTF8) {
					return Encoding.UTF8.decode(payload);
				} else if (format === SerializedValueType.JSON) {
					return ZincDB.Tools.parseJSONOrUndefined(Encoding.UTF8.decode(payload));
				} else
					throw new TypeError(`Encunterened an unsupported input with type identifer ${format}`);
			}
		}
	}
}