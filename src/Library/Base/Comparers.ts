namespace ZincDB {
	export namespace Comparers {
		export const ascendingNumberComparer = (a: number, b: number): number => {
			return a - b;
		}

		export const simpleStringComparer = (a: string, b: string): number => {
			if (a === b)
				return 0;
			else if (a < b)
				return -1;
			else
				return 1;
		}

		export const getLocaleComparer = (locales?: string, options?: any): Comparer<string> => {
			if (typeof Intl !== "undefined")
				return (new Intl.Collator(locales, options)).compare;
			else
				return (str1: string, str2: string) => {
					if (str1 != null)
						return str1.localeCompare(str2, options);
					else if (str2 != null)
						return -1;
					else
						return 0;
				}
		}

		export const compareStringsAndLogToConsole = (string1: string, string2: string): boolean => {
			if (string1.length !== string2.length) {
				console.log("Strings did not match: String 1 length is " + string1.length + ", String 2 length is " + string2.length);

				return false;
			}

			for (let i = 0; i < string1.length; i++)
				if (string1[i] !== string2[i]) {
					console.log("Strings did not match: string1[" + i + "] === " + string1[i] + ", string2[" + i + "] === " + string2[i]);
					return false;
				}

			return true;
		}
	}
}