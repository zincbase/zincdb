namespace ZincDB {
	export class SortingBenchmarks {
		length = 1000000;
		elements: number[] = [];

		elementsForStableSort: List<number>;
		elementsForNativeSort: number[];

		elementsForStableSort_1K: List<number>;
		elementsForNativeSort_1K: number[];

		elementsForStableSort_100: List<number>;
		elementsForNativeSort_100: number[];


		comparer: Comparer<number> = Comparers.ascendingNumberComparer;

		constructor() {
			this.elements = JSRandom.getIntegerArray(this.length, 0, 10000);
		}

		beforeEach() {
			this.elementsForStableSort = new List<number>(this.elements.slice(0));
			this.elementsForNativeSort = this.elements.slice(0);

			this.elementsForStableSort_1K = this.elementsForStableSort.slice(0, 1000);
			this.elementsForNativeSort_1K = this.elements.slice(0, 1000);

			this.elementsForStableSort_100 = this.elementsForStableSort.slice(0, 100);
			this.elementsForNativeSort_100 = this.elements.slice(0, 100);
		}

		stableQuickSort_1M() {
			this.elementsForStableSort.sort(this.comparer);
		}

		nativeSort_1M() {
			this.elementsForNativeSort.sort(this.comparer);
		}

		stableQuickSort_1K() {
			this.elementsForStableSort_1K.sort(this.comparer);
		}

		nativeSort_1K() {
			this.elementsForNativeSort_1K.sort(this.comparer);
		}

		stableQuickSort_100() {
			this.elementsForStableSort_100.sort(this.comparer);
		}

		nativeSort_100() {
			this.elementsForNativeSort_100.sort(this.comparer);
		}

		reverseNative() {
			this.elementsForNativeSort.reverse();
		}

		reverseInPlace() {
			this.elementsForStableSort.reverse();
		}

		static start() {
			const sortBench = new SortingBenchmarks();
			const benchmark = new Benchmark(sortBench, { maximumSamples: 1000, maximumTime: 500, logToDocument: true });
			benchmark.runAll([sortBench.comparer]);
		}
	}
}