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

				return "/" + regexp.source + "/" + flags;
			}

			export const decode = function (input: string): any {
				if (typeof input !== "string")
					throw new TypeError("The given input is not a string");

				if (input[0] !== "/")
					throw new Error(`The given input '${input}' is not a valid RegExpString as it doesn't start with a '/'`);

				const finalSeparatorIndex = input.lastIndexOf("/");

				if (finalSeparatorIndex === 0)
					throw new Error(`The given input '${input}' is not a valid RegExpString as it doesn't contain a closing separator '/'`);

				return new RegExp(input.substring(1, finalSeparatorIndex), input.substring(finalSeparatorIndex + 1));
			}
		}
	}
}
