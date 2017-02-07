namespace ZincDB {
	export abstract class RandomGenerator {
		currentValue: number;

		constructor(seed?: number) {
			if (seed == null)
				seed = Date.now();

			this.currentValue = seed;
		}

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

		getByteArray(length: number): Uint8Array {
			const result = new Uint8Array(length);

			for (let i = 0; i < length; i++)
				result[i] = this.getIntegerInRange(0, 256);

			return result;
		}

		getWordCharacterString(length: number) {
			const characters = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789`;

			let randomString = ``;
			for (let i = 0; i < length; i++)
				randomString += characters.charAt(this.getIntegerInRange(0, characters.length));

			return randomString;
		}

		getDigitString(length = 53): string {
			if (length > 53)
				throw new RangeError(`Digit string cannot be longer than 53 characters`);

			return (this.getFloat()).toFixed(length).substr(2, length);
		}

		getUTF16String(length: number): string {
			const stringBuilder = new StringBuilder();

			for (let i = 0; i < length; i++)
				stringBuilder.appendCodePoint(this.getCodePoint());

			return stringBuilder.getOutputString();
		}

		getCodePoint(): number {
			let randomCodePoint: number;

			do {
				randomCodePoint = this.getIntegerInRange(0, 1112064);
			} while (randomCodePoint >= 0xD800 && randomCodePoint <= 0xDFFF);

			return randomCodePoint;
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

	export class JSRandom extends RandomGenerator {
		constructor() {
			super();
		}

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

	// Similar to the minstd_rand function (C++11)
	export class LehmerRandomGenerator extends RandomGenerator {
		constructor(seed: number = 0) {
			if (seed > 186596491780)
				throw new RangeError(`A seed larger than 186596491780 should not be used as it significantly decreases the quality of the psuedorandom values (186596491780 * 48271 is the last multiplication result still smaller than 2^53)`);

			super(seed);
		}

		getInteger(): number {
			this.currentValue = (this.currentValue * 48271) % 2147483647;
			return this.currentValue;
		}

		getFloat(): number {
			return this.getInteger() * 4.656612875245796924105750827168e-10; // (1/2147483647)
		}

		// Take the top 16 and 15 bits of two values to create a higher quality unsigned 31bit number
		getIntegerHQ(): number {
			return ((this.getInteger() >>> 15) << 15) | (this.getInteger() >>> 16);
		}

		getFloatHQ(): number {
			return this.getIntegerHQ() * 4.656612875245796924105750827168e-10; // (1/2147483647)
		}
	}

	export class MultiplyWithCarryRandomGenerator extends RandomGenerator {
		private carry = 1;

		constructor(seed: number = 0) {
			super(seed | 0);
		}

		getFloat() {
			const result = (2091639 * this.currentValue) + (this.carry * 2.3283064365386963e-10); // (2^-32)
			this.carry = result | 0;
			this.currentValue = result - this.carry;

			return this.currentValue;
		}
	}
}
