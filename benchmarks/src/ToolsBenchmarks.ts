namespace ZincDB {
	export class ToolsBenchmarks {
		val1 = 1457332888612;

		constructor() {
		}

		beforeEach() {

		}

		integerToBase10AsciiStringBytes_JS() {
			for (let i = 0; i < 1000; i++)
				Tools.integerToBase10AsciiStringBytes(this.val1);
		}

		integerToBase10AsciiStringBytes_Native() {
			for (let i = 0; i < 1000; i++)
				Encoding.UTF8.encode(this.val1.toString());
		}

		static start() {
			const bench = new ToolsBenchmarks();
			const benchmark = new Benchmark(bench, { maximumSamples: 1000, maximumTime: 200, logToDocument: true });
			benchmark.runAll([]);
		}
	}
}