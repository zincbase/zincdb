namespace ZincDB {
	export namespace Encoding {
		export namespace JsonX {
			export const encode = function (input: any): string {
				if (input === undefined)
					return "";

				return JSON.stringify(input);
			}

			export const decode = function (input: string): any {
				if (input === "")
					return undefined;

				return JSON.parse(input);
			}
		}
	}
}
