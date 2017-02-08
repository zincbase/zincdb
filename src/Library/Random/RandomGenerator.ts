namespace ZincDB {
	export abstract class RandomGenerator {
		getIntegerInRange(minimum: number, maximum: number) {
			return minimum + Math.floor(this.getFloat() * (maximum - minimum));
		}

		getIntegerUpTo(maximumInclusive: number) {
			return this.getIntegerInRange(0, maximumInclusive + 1);
		}

		getFloatInRange(minimum: number, maximum: number) {
			return minimum + this.getFloat() * (maximum - minimum);
		}

		getIntegerArray(length: number, min: number, max: number): number[] {
			const result = new Array(length);

			for (let i = 0; i < length; i++)
				result[i] = this.getIntegerInRange(min, max);

			return result;
		}

		getBytes(length: number): Uint8Array {
			const result = new Uint8Array(length);

			for (let i = 0; i < length; i++)
				result[i] = (this.getFloat() * 256) | 0;

			return result;
		}

		getWordCharacterString(length: number) {
			const characters = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789`;

			let randomString = ``;
			for (let i = 0; i < length; i++)
				randomString += characters.charAt(this.getIntegerInRange(0, characters.length));

			return randomString;
		}

		getCodePoint(): number {
			let randomCodePoint: number;

			do {
				randomCodePoint = this.getIntegerInRange(0, 1112064);
			} while (randomCodePoint >= 0xD800 && randomCodePoint <= 0xDFFF);

			return randomCodePoint;
		}

		getUTF16String(length: number): string {
			const stringBuilder = new StringBuilder();

			for (let i = 0; i < length; i++)
				stringBuilder.appendCodePoint(this.getCodePoint());

			return stringBuilder.getOutputString();
		}

		getDigitString(length = 53): string {
			if (length > 53)
				throw new RangeError(`Digit string cannot be longer than 53 characters`);

			return (this.getFloat()).toFixed(length).substr(2, length);
		}

		divideNumberToRandomIntegerAddends(num: number, count: number): List<number> {
			const parts = new List<number>();

			parts.addFromFunction((index) => this.getFloat() * (num / count), count);

			const sum = parts.reduce<number>((value, sum) => sum += value, 0);
			const normalizingFactor = num / sum;

			parts.transform((value) => Math.floor(value * normalizingFactor))

			return parts;
		}

		abstract getFloat(): number;
	}


}
