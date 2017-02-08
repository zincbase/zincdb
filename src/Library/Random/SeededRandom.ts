namespace ZincDB {
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
			// Note this generated positive integers only up to 2^31-2
			this.currentValue = (this.currentValue * 48271) % 2147483647;
			return this.currentValue;
		}

		getFloat(): number {
			return this.getInteger() * 4.656612875245796924105750827168e-10; // (1/2147483647)
		}

		getBytes(length: number): Uint8Array {
			const result = new Uint8Array(length);

			for (let i = 0; i < length; i++) {
				// Take the third byte (bits 16..24, which should have better
				// randomness properties than the lower ones
				result[i] = (this.getInteger() >>> 16) & 0xff;
			}

			return result;
		}
	}
}
