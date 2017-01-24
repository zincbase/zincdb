namespace ZincDB {
	export namespace Encoding {
		export namespace Underscore {
			const charCodeOf = (s: string) => s.charCodeAt(0);

			export const encode = function (input: string): string {
				const inputAsUTF8 = UTF8.encode(input);
				let result = "";

				for (let i = 0; i < inputAsUTF8.length; i++) {
					const byte = inputAsUTF8[i];

					if ((byte >= charCodeOf("0") && byte <= charCodeOf("9")) ||
						(byte >= charCodeOf("A") && byte <= charCodeOf("Z")) ||
						(byte >= charCodeOf("a") && byte <= charCodeOf("z"))) {
						result += String.fromCharCode(byte);
					}
					else if (byte === charCodeOf("_")) {
						result += "__";
					}
					else {
						result += "_" + Hex.encode(new Uint8Array([byte]));
					}
				}

				return result;
			}

			export const decode = function (input: string): string {
				let resultBytes: number[] = [];
				let i = 0;

				while (i < input.length) {
					const char = input[i];

					if (char === "_") {
						const nextChar = input[i + 1];
						if (nextChar === undefined)
							throw new Error(`Found an unterminated underscore escape sequence at position ${i}.`);
						else if (nextChar === "_") {
							resultBytes.push(charCodeOf("_"));
							i += 2;
						}
						else {
							const hexString = input.substr(i + 1, 2);
							if (!/^[0-9a-f][0-9a-f]$/.test(hexString))
								throw new Error(`Found an illegal hex value '${hexString}' at position ${i + 1}.`);

							const decodedHexValue = Hex.decode(hexString);
							resultBytes.push(decodedHexValue[0]);
							i += 3;
						}
					} else if (/^[A-Za-z0-9]$/.test(char)) {
						resultBytes.push(charCodeOf(char));
						i += 1;
					} else {
						throw new Error(`An illegal unescaped character '${char}' was found at position ${i}.`);
					}
				}

				return UTF8.decode(new Uint8Array(resultBytes))
			}
		}
	}
}