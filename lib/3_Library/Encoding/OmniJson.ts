namespace ZincDB {
	export namespace Encoding {
		export namespace OmniJson {
			export const encode = function (input: any): string {
				if (input === undefined)
					return "";

				return JSON.stringify(input, (key, value) => {
					if (typeof value === "string" || value instanceof Uint8Array) {
						return OmniString.encode(value);
					} else {
						return value;
					}
				});
			}

			export const decode = function (input: string): any {
				if (input == null)
					return input;

				if (input === "")
					return undefined;

				return JSON.parse(input, (key, value) => {
					if (typeof value === "string") {
						return OmniString.decode(value);
					} else {
						return value;
					}
				});				
			}
		}
	}
}