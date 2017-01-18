namespace ZincDB {
	export namespace Encoding {
		export namespace OmniString {
			export const encode = function (input: any): string {
				if (input instanceof Uint8Array)
					return "BB64" + Base64.encode(input)
				else if (typeof input === "string")
					return "UTF8" + input;
				else
					return "JSON" + ZincDB.Tools.stringifyJSONOrUndefined(input);
			}

			export const decode = function (input: string): any {
				if (input == null)
					return input;

				const valuePrefix = input.substr(0, 4);
				const valuePayload = input.substr(4);

				if (valuePrefix === "UTF8")
					return valuePayload;
				else if (valuePrefix === "JSON")
					return ZincDB.Tools.parseJSONOrUndefined(valuePayload)
				else if (valuePrefix === "BB64")
					return Base64.decode(valuePayload)
				else
					throw new Error(`Encountered a value with an unsupported encoding '${valuePrefix}`);
			}
		}
	}
}