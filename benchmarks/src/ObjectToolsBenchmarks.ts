namespace ZincDB {
	export class ObjectToolsBenchmarks {
		simpleObject = { good: <any>null, ab: 1, cd: { do: { a: ["goo", [57, { boo: "Hi!" }]] } }, bc: "woekfoekw", nice: { a: 543 } };
		simpleObjectClone = { good: <any>null, ab: 1, cd: { do: { a: ["goo", [57, { boo: "Hi!" }]] } }, bc: "woekfoekw", nice: { a: 543 } };

		simpleObject_x1000: any[] = [];

		simpleObjectJSON: string;
		simpleObjectJSON_x1000: string;

		simpleObjectJSONForEval: string;

		constructor() {
			for (var i = 0; i < 1000; i++)
				this.simpleObject_x1000.push(this.simpleObject);

			this.simpleObjectJSON = JSON.stringify(this.simpleObject);
			this.simpleObjectJSONForEval = '(' + this.simpleObjectJSON + ')';

			this.simpleObjectJSON_x1000 = JSON.stringify(this.simpleObject_x1000);
		}

		jsonCloneSimpleObject_x1000() {
			for (let i = 0; i < 1000; i++)
				JSON.parse(JSON.stringify(this.simpleObject));
		}

		deepCloneObject_x1000() {
			for (let i = 0; i < 1000; i++)
				ObjectTools.deepClone(this.simpleObject);
		}

		parseJSON_x1000() {
			for (let i = 0; i < 1000; i++)
				JSON.parse(this.simpleObjectJSON);
		}

		parseConcatenatedJSON() {
			JSON.parse(this.simpleObjectJSON_x1000);
		}

		evalJSON_x1000() {
			for (let i = 0; i < 1000; i++)
				eval(this.simpleObjectJSONForEval);
		}


		stringifyJSON_x1000() {
			for (let i = 0; i < 1000; i++)
				JSON.stringify(this.simpleObject);
		}

		deepFreezeSimpleObject_x1000() {
			for (let i = 0; i < 1000; i++)
				ObjectTools.deepFreezeSimpleObject(this.simpleObject);
		}

		compareJSONObjects_x1000() {
			for (let i = 0; i < 1000; i++)
				ObjectTools.compareJSONObjects(this.simpleObject, this.simpleObjectClone);
		}

		static start() {
			const comparerBench = new ObjectToolsBenchmarks();
			const benchmark = new Benchmark(comparerBench, { maximumSamples: 1000, maximumTime: 1000, logToDocument: true });
			benchmark.runAll([]);
		}
	}

	/*
		export class RandomBench
		{
			randomNumberTest()
			{
				const test = 100 + Math.floor(Math.random() * 100);
			}
	
		}
	
		export class SortingBenchmark
		{
			length = 100000;
			elements: number[] = [];
	
			elementsForAsyncSort: number[];
			elementsForNativeSort: number[];
	
			sorterTask: Task;
			comparer: Comparer<number> = Tools.ascendingNumberComparer;
	
			constructor()
			{
				for (let i = 0; i < this.length; i++)
					this.elements.push(Tools.getRandomIntegerInRange(0, 10000));
			}
	
			beforeEach()
			{
				this.elementsForAsyncSort = this.elements.slice(0);
				this.elementsForNativeSort = this.elements.slice(0);
	
				this.sorterTask = Tools.quickSortAsync(this.elementsForAsyncSort, this.comparer, 100000);
			}
	
			quickSorter()
			{
				this.sorterTask.startSync();
			}
	
			nativeSorter()
			{
				this.elementsForNativeSort.sort(this.comparer);
			}
	
			reverseNative()
			{
				this.elementsForNativeSort.reverse();
			}
	
			reverseInPlace()
			{
				Tools.reverseArray(this.elementsForNativeSort);
			}
	
			static run()
			{
				const sortBench = new SortingBenchmark();
				const benchmark = new Benchmark(sortBench, { maximumSamples: 1000, maximumTime: 500 });
				benchmark.runAll([sortBench.comparer]);
			}
		}
	
		export class ComparerBench
		{
			str1 = "asvmjfiowejr";
			str2 = "asvmjfiowejrt";
			repeatCount = 1000;
			localeComparerFunc;
			localeComparerFuncBaseOnly;
	
			stringComparerLookupTable;
			lookupTableJSON;
	
			constructor()
			{
				this.localeComparerFunc = Tools.getLocaleComparer();
				this.localeComparerFuncBaseOnly = Tools.getLocaleComparer("en", { sensitivity: "base" });
			}
	
			stringifyLookupTable()
			{
				this.lookupTableJSON = JSON.stringify(this.stringComparerLookupTable);
				//document.write(this.lookupTableJSON);
			}
	
			parseLookupTable()
			{
				const result = JSON.parse(this.lookupTableJSON);
			}
	
			simpleStringComparer()
			{
				for (let i = 0; i < this.repeatCount; i++)
					Tools.simpleStringComparer(this.str1, this.str2);
			}
	
			localeComparer()
			{
				for (let i = 0; i < this.repeatCount; i++)
					this.localeComparerFunc(this.str1, this.str2);
			}
	
			localeComparerBaseOnly()
			{
				for (let i = 0; i < this.repeatCount; i++)
					this.localeComparerFuncBaseOnly(this.str1, this.str2);
			}
	
			static run()
			{
				const comparerBench = new ComparerBench();
				const benchmark = new Benchmark(comparerBench, { maximumSamples: 1000, maximumTime: 1000 });
				benchmark.runAll([comparerBench.localeComparerFunc, comparerBench.localeComparerFuncBaseOnly]);
			}
		}
	
		export class ForInBenchmark
		{
			object10 = {}
				object100 = {}
				object1000 = {}
				object10000 = {}
				object100000 = {}
	
				constructor()
			{
				for (let i = 0; i < 10; i++)
					this.object10[i.toString()] = i;
	
				for (let i = 0; i < 100; i++)
					this.object100[i.toString()] = i;
	
				for (let i = 0; i < 1000; i++)
					this.object1000[i.toString()] = i;
	
				for (let i = 0; i < 10000; i++)
					this.object10000[i.toString()] = i;
	
				for (let i = 0; i < 100000; i++)
					this.object100000[i.toString()] = i;
			}
	
			object10Test()
			{
				for (const x in this.object10) { }
			}
			object100Test()
			{
				for (const x in this.object100) { }
			}
			object1000Test()
			{
				for (const x in this.object1000) { }
			}
			object10000Test()
			{
				for (const x in this.object10000) { }
			}
			object100000Test()
			{
				for (const x in this.object100000) { }
			}
	
			static run()
			{
				const forInBenchmarks = new ForInBenchmark();
				const benchmark = new Benchmark(forInBenchmarks, { maximumSamples: 100, maximumTime: 250 });
	
				benchmark.run(forInBenchmarks.object10Test);
				benchmark.run(forInBenchmarks.object100Test);
				benchmark.run(forInBenchmarks.object1000Test);
				benchmark.run(forInBenchmarks.object10000Test);
				benchmark.run(forInBenchmarks.object100000Test);
			}
	
		}
		
		export class TimestampBenchmarks
		{
			chromeInterval;
			performanceNow;
			dateNow;
	
			constructor()
			{
				if (typeof (chrome) !== 'undefined' && chrome.Interval)
				{
					const chromeIntervalObject = new chrome.Interval();
					chromeIntervalObject.start();
	
					this.chromeInterval = () => chromeIntervalObject.microseconds() / 1000;
				}
	
				if (window.performance && window.performance.now)
				{
					this.performanceNow = () => window.performance.now();
				}
	
				{
					this.dateNow = () => Date.now();
				}
			}
	
			chromeIntervalTimesamp()
			{
				if (!this.chromeInterval)
					return;
	
				for (let i = 0; i < 1000; i++)
					this.chromeInterval();
			}
	
			performanceNowTimesamp()
			{
				for (let i = 0; i < 1000; i++)
					this.performanceNow();
			}
	
			dateNowTimesamp()
			{
				for (let i = 0; i < 1000; i++)
					this.dateNow();
			}
	
			static run()
			{
				const timestampBenchmarks = new TimestampBenchmarks();
				const benchmark = new Benchmark(timestampBenchmarks, { maximumSamples: 1000, maximumTime: 200 });
				benchmark.runAll([timestampBenchmarks.chromeInterval, timestampBenchmarks.dateNow, timestampBenchmarks.performanceNow]);
			}
		}
	
		declare const CryptoJS;
	*/
}
