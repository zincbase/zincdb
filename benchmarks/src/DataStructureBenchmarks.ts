namespace ZincDB {
	export class DataStructureBenchmarks {
		array: number[];
		list: List<number>;
		sortedList: SortedList<number>;

		testEntries: DB.Entry<any>[];

		jsObject: any;
		jsMap: Map<string, DB.Entry<any>>;

		constructor() {
			this.testEntries = [];

			for (let i = 0; i < 10000; i++)
				this.testEntries.push({ key: JSRandom.getWordCharacterString(10), value: "Hello World!", metadata: {} });
		}

		beforeEach() {
			this.array = [];

			for (let i = 0; i < 10000; i++)
				this.array.push(i);

			this.jsObject = {};
			this.jsMap = new Map<string, DB.Entry<any>>();
			
			this.list = new List(this.array);
			this.sortedList = new SortedList(Comparers.ascendingNumberComparer, this.array, true);
			this.jsObject = {};
		}

		push_x10000() {
			for (let i = 0; i < 10000; i++)
				this.array.push(1);
		}

		pop_x10000() {
			for (let i = 0; i < 10000; i++)
				this.array.pop();
		}

		unshift_x1000() {
			for (let i = 0; i < 1000; i++)
				this.array.unshift(1);
		}

		shift_x1000() {
			for (let i = 0; i < 1000; i++)
				this.array.shift();
		}

		spliceAndRemoveMiddleElement_x1000() {
			for (let i = 0; i < 1000; i++)
				this.array.splice(5000, 1);
		}

		indexOf_x1000() {
			for (let i = 0; i < 1000; i++)
				this.array.indexOf(i);
		}

		listIndexOf_x1000() {
			for (let i = 0; i < 1000; i++)
				this.list.indexOf(i);
		}

		sortedListBinaryIndexOf_x1000() {
			for (let i = 0; i < 1000; i++)
				this.sortedList.binarySearchForFirstExactMatch(i);
		}

		jsObjectGet_x1000() {
			var temp;
			
			for (let i = 0; i < 1000; i++)
				temp = this.jsObject[this.testEntries[i].key];
		}

		jsObjectAdd_x1000() {
			for (let i = 5000; i < 6000; i++)
				this.jsObject[this.testEntries[i].key] = this.testEntries[i];
		}

		jsObjectUpdate_x1000() {
			for (let i = 1000; i < 2000; i++)
				this.jsObject[this.testEntries[i].key] = this.testEntries[i];
		}

		jsMapGet_x1000() {
			for (let i = 0; i < 1000; i++)
				this.jsMap.get(this.testEntries[i].key);
		}

		jsMapAdd_x1000() {
			for (let i = 5000; i < 6000; i++)
				this.jsMap.set(this.testEntries[i].key, this.testEntries[i]);
		}

		jsMapUpdate_x1000() {
			for (let i = 1000; i < 2000; i++)
				this.jsMap.set(this.testEntries[i].key, this.testEntries[i]);
		}

		static start() {
			const bench = new DataStructureBenchmarks();
			const benchmark = new Benchmark(bench, { maximumSamples: 1000, maximumTime: 500, logToDocument: true });
			benchmark.runAll([]);
		}
	}
}