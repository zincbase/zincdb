namespace ZincDB {
	export class EntrySerializerBenchmarks {
		testHeader: DB.EntryHeader;
		serializedHeader: Uint8Array;

		testEntry: DB.Entry<any>;
		serializedEntry: Uint8Array;

		constructor() {
			this.testHeader = {
				totalSize: 2374682736482,
				headerVersion: 444,
				keySize: 12537,
				keyEncoding: 93,
				valueEncoding: 113,
				encryptionMethod: 75,
				flags: 68,
				updateTime: 54561689616384,
				commitTime: 24345345345244,
				headerChecksum: 289645328,
				payloadChecksum: 1833682315,
			}

			this.serializedHeader = DB.EntrySerializer.serializeHeader(this.testHeader);

			this.testEntry = {
				key: "你好世界",
				value: { data: "Hello World! 你好世界!", num: 42 },
				metadata: { updateTime: 54561689616384 }
			}

			this.serializedEntry = DB.EntrySerializer.serializeEntry(this.testEntry);
		}

		beforeEach() {

		}

		serializeHeader_1000x() {
			for (let i = 0; i < 1000; i++)
				this.serializedHeader = DB.EntrySerializer.serializeHeader(this.testHeader);
		}

		deserializeHeader_1000x() {
			for (let i = 0; i < 1000; i++)
				DB.EntrySerializer.deserializeHeader(this.serializedHeader);
		}

		serializeEntry_1000x() {
			for (let i = 0; i < 1000; i++)
				this.serializedEntry = DB.EntrySerializer.serializeEntry(this.testEntry);
		}

		deserializeEntry_1000x() {
			for (let i = 0; i < 1000; i++)
				DB.EntrySerializer.deserializeFirstEntry(this.serializedEntry);
		}

		serializeEntryEncrypted_1000x() {
			for (let i = 0; i < 1000; i++)
				this.serializedEntry = DB.EntrySerializer.serializeEntry(this.testEntry, "4d2d3fb0356cf6a66617e6454641697b");
		}

		deserializeEntryEncrypted_1000x() {
			for (let i = 0; i < 1000; i++)
				DB.EntrySerializer.deserializeFirstEntry(this.serializedEntry, "4d2d3fb0356cf6a66617e6454641697b");
		}

		static start() {
			const bench = new EntrySerializerBenchmarks();
			const benchmark = new Benchmark(bench, { maximumSamples: 1000, maximumTime: 200, logToDocument: true });
			benchmark.runAll([]);
		}
	}
}
