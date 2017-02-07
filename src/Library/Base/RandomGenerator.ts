namespace ZincDB {
	export abstract class RandomGenerator {
		getIntegerInRange(minimum: number, maximum: number) {
			return minimum + Math.floor(this.getFloat() * (maximum - minimum));
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

	// A non-seeded generator based on the native implementation in the Javascript runtime
	// Also including convenient static methods that can be used without creating an instance.
	export class JSRandom extends RandomGenerator {
		getFloat(): number {
			return Math.random();
		}

		static getFloat(): number {
			return JSRandom.globalInstance.getFloat();
		}

		static getFloatInRange(min: number, max: number): number {
			return JSRandom.globalInstance.getFloatInRange(min, max);
		}

		static getIntegerInRange(min: number, max: number): number {
			return JSRandom.globalInstance.getIntegerInRange(min, max);
		}

		static getIntegerArray(length: number, min: number, max: number): number[] {
			return JSRandom.globalInstance.getIntegerArray(length, min, max);
		}

		static getBytes(length: number) {
			return JSRandom.globalInstance.getBytes(length);
		}

		static getWordCharacterString(length: number): string {
			return JSRandom.globalInstance.getWordCharacterString(length);
		}

		static getCodePoint(): number {
			return JSRandom.globalInstance.getCodePoint();
		}

		static getUTF16String(length: number): string {
			return JSRandom.globalInstance.getUTF16String(length);
		}

		static getDigitString(length: number): string {
			return JSRandom.globalInstance.getDigitString(length);
		}

		private static globalInstance = new JSRandom();
	}

	// A simple multiplicative congruential pseudo-random number generator
	// Similar to the minstd_rand function (C++11)
	// For more information, see:
	// http://www.cplusplus.com/reference/random/minstd_rand/
	// https://en.wikipedia.org/wiki/Lehmer_random_number_generator
	export class SeededRandom extends RandomGenerator {
		private currentValue: number;

		// The default seed was chosen at random as a prime in the range [1, 2147483647)
		constructor(seed: number = 1103521651) {
			if (seed > 186596491780)
				throw new RangeError(`A seed larger than 186596491780 should not be used as it significantly decreases the quality of the psuedorandom values (186596491780 * 48271 is the last multiplication result still smaller than 2^53)`);

			super();

			this.currentValue = seed;
		}

		getInteger(): number {
			this.currentValue = (this.currentValue * 48271) % 2147483647;
			return this.currentValue;
		}

		getFloat(): number {
			return this.getInteger() * 4.656612875245796924105750827168e-10; // (1/2147483647)
		}

		getBytes(length: number): Uint8Array {
			const result = new Uint8Array(length);

			for (let i = 0; i < length; i++) {
				result[i] = (this.getInteger() >>> 16) & 0xff;
			}

			return result;
		}
	}
}
