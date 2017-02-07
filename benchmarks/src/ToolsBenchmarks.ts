namespace ZincDB {
	export class ToolsBenchmarks {
		lehmerRand = new SeededRandom(1234);

		constructor() {
		}

		beforeEach() {
		}

		randomBytesNonCryptoNative_x1000() {
			for (let i = 0; i < 1000; i++)
				JSRandom.getBytes(100);
		}

		randomBytesNonCryptoLehmer_x1000() {
			for (let i = 0; i < 1000; i++)
				this.lehmerRand.getBytes(100);
		}

		randomBytesCrypto_x1000() {
			for (let i = 0; i < 1000; i++)
				Crypto.Random.getBytes(100);
		}

		static start() {
			const bench = new ToolsBenchmarks();
			const benchmark = new Benchmark(bench, { maximumSamples: 1000, maximumTime: 200, logToDocument: true });
			benchmark.runAll([]);
		}
	}
}
