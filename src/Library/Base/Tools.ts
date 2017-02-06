namespace ZincDB {
	export namespace Tools {
		export const padTwoDigitNumber = function(num: number): string {
			const numString = num.toString();

			if (numString.length === 1)
				return "0" + numString;
			else
				return numString;
		}

		export const formatUnixTimestampToShortDate = function(timestamp: number): string {
			let dateString = "";
			if (typeof timestamp == "number") {
				const dateObject = new Date(timestamp);
				dateString = Tools.padTwoDigitNumber(dateObject.getUTCDate() + 1) + "/" + Tools.padTwoDigitNumber(dateObject.getUTCMonth() + 1) + "/" + dateObject.getUTCFullYear();
			}

			return dateString;
		}

		export const chooseMostAppropriateMagnitudeForValue = function(value: number, orderedMagnitudes: number[]) {
			if (orderedMagnitudes == null || orderedMagnitudes.length == 0)
				throw new Error(`chooseMostAppropriateMagnitudeForValue: invalid parameter`);

			if (value <= orderedMagnitudes[0])
				return orderedMagnitudes[0];

			for (let i = 1; i < orderedMagnitudes.length; i++)
				if (orderedMagnitudes[i] >= value)
					return orderedMagnitudes[i - 1];

			return orderedMagnitudes[orderedMagnitudes.length - 1];
		}

		export const repeat = function(func: (index: number) => void, count: number) {
			for (let i = 0; i < count; i++)
				func(i);
		}

		export const setStringCharacter = function(str: string, position: number, newCharacter: string): string {
			return str.substr(0, position) + newCharacter + str.substr(position + 1);
		}

		export const parseBase10IntFromASCIIBytes = function(bytes: IndexedCollection<number>, startPosition: number, endPosition: number) {
			let result = 0;
			let multiplier = 1;

			for (let i = endPosition - 1; i >= startPosition; i--) {
				result += (bytes[i] - 48) * multiplier;
				multiplier *= 10;
			}

			return result;
		}

		const base10IntegerScaleTable = [0, 1, 10, 100, 1000, 10000, 100000, 1000000, 10000000, 100000000, 1000000000, 10000000000, 100000000000, 1000000000000, 10000000000000, 100000000000000, 1000000000000000];
		export const getDigitCountForPositiveInteger = function(positiveInteger: number) {
			const scaleTable = base10IntegerScaleTable;

			let digitCount = 0;

			for (let i = 1; positiveInteger >= scaleTable[i]; i++)
				digitCount++;

			return digitCount;
		}

		export const integerToBase10AsciiStringBytes = function(num: number): Uint8Array {
			if (num === 0)
				return new Uint8Array([48]);

			const digitCount = getDigitCountForPositiveInteger(num);
			const scaleTable = base10IntegerScaleTable;
			const result = new Uint8Array(digitCount);

			for (let i = 0; i < digitCount; i++) {
				const currentScale = scaleTable[digitCount - i];
				const quotient = Math.floor(num / currentScale);

				num -= (quotient * currentScale);
				result[i] = 48 + quotient;
			}

			return result;
		}

		export const integerToBase10AsciiStringBytes2 = function(num: number): Uint8Array {
			if (num === 0)
				return new Uint8Array([48]);

			const digitCount = getDigitCountForPositiveInteger(num);
			const scaleTable = base10IntegerScaleTable;
			const result = new Uint8Array(digitCount);

			for (let i = 0; i < digitCount; i++) {
				const currentScale = scaleTable[digitCount - i];

				let quotient = 0;

				while (num >= currentScale) {
					num -= currentScale;
					quotient++;
				}

				result[i] = 48 + quotient;
			}

			return result;
		}

		export const stringStartsWith = function(str: string, prefix: string) {
			if (typeof str !== "string" || typeof prefix !== "string")
				return false;

			return str.substr(0, prefix.length) === prefix;
		}
	}
}