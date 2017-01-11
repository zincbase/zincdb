namespace ZincDB {
	export namespace Encoding {
		export namespace OmniString {
			export const encode = function(input: any): string {
				if (input instanceof Uint8Array)
					return "BB64:" + Base64.encode(input)
				else
					return "JSON:" + ZincDB.Tools.stringifyJSONOrUndefined(input);				
			}

			export const decode = function(input: string): any {
				if (input == null)
					return input;

				const valuePrefix = input.substr(0, 5);

				if (valuePrefix === "JSON:")
					return ZincDB.Tools.parseJSONOrUndefined(input.substr(5))
				else if (valuePrefix === "BB64:")
					return Base64.decode(input.substr(5))
				else
					throw new Error("Unsupported value found");				
			}
		}
	}
}