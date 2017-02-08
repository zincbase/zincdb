/// <reference path="RandomGenerator.ts" />

namespace ZincDB {
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
}
