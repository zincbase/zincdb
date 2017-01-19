namespace ZincDB {
	export namespace Encoding {
		export namespace OmniString {
			/*
			00: Text
			01: JSONX
			02: OmniJson
			03: Date
			04: Uint8Array as Base64
			*/

			export const encode = function (input: any): string {
				if (typeof input === "string")
					return "00" + input;
				else if (input instanceof Date)
					return "03" + JSON.stringify(input.valueOf());
				else if (input instanceof Uint8Array)
					return "04" + Base64.encode(input);
				else
					return "02" + OmniJson.encode(input);
			}

			export const decode = function (input: string): any {
				if (input == null)
					return input;

				const encodingType = input.substr(0, 2);
				const str = input.substr(2);

				switch (encodingType) {
					case "00": // Text
						return str;
					case "01": // JSONX
						return JsonX.decode(str);
					case "02": // OmniJson
						return OmniJson.decode(str);
					case "03": // Date
						return new Date(JSON.parse(str));
					case "04": // Uint8Array as Base64
						return Base64.decode(str);
					default:
						throw new Error(`Encountered a value with an unsupported encoding '${encodingType}`);
				}
			}
		}
	}
}