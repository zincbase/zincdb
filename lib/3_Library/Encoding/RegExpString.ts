namespace ZincDB {
	export namespace Encoding {
		export namespace RegExpString {
			export const encode = function (regexp: RegExp): string {
				if (!(regexp instanceof RegExp))
					throw new TypeError("The given input is not a RegExp object");
				
				let flags = "";

				if (regexp.global) flags += 'g';
				if (regexp.ignoreCase) flags += 'i';				
				if (regexp.multiline) flags += 'm';
				if (regexp["unicode"]) flags += 'u';
				if (regexp["sticky"]) flags += 'y';

				return flags + ":" + regexp.source;
			}

			export const decode = function (input: string): any {
				if (typeof input !== "string")
					throw new TypeError("The given input is not a string");
				
				const separatorIndex = input.indexOf(":");

				if (separatorIndex === -1)
					throw new Error(`The given input '${input}' is not a valid RegExpString as it doesn't contain the separator ':'`);
				
				return new RegExp(input.substring(separatorIndex + 1), input.substring(0, separatorIndex));
			}
		}
	}
}