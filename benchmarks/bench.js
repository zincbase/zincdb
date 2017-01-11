process.on('uncaughtException', function (e) {
	console.log("Node.js uncaughtException:");
	console.log(e.stack);
});

const ZincDB = require("../build/development/zincdb")

//ZincDB.ToolsBenchmarks.start();
//ZincDB.NodeCompressionBenchmarks.start();
//ZincDB.SortingBenchmarks.start();
//ZincDB.DataStructureBenchmarks.start();
//ZincDB.ObjectStoreBenchmarks.start();
//ZincDB.EncodingBenchmarks.start();
//ZincDB.NodeServerCommonBenchmarks.start();
//ZincDB.ObjectToolsBenchmarks.start();
ZincDB.EntrySerializerBenchmarks.start();