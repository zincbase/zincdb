namespace ZincDB {
	export class NodeCompressionBenchmarks {
		static async start() {
			const randomString1M = JSRandom.getWordCharacterString(1000000);
			let repeatingString = "";
			for (let i = 0; i < 1000000; i++)
				repeatingString += "1234567890";

			const timer = new Timer();

			timer.restart();
			const compressionResult = await Compression.compressAsync(randomString1M, undefined, "gzip", { level: 1 });
			timer.logAndRestart("Compress");
			log("Compressed length: " + compressionResult.length);

			const decompressionResult = await Compression.decompressAsync(compressionResult);
			timer.logAndRestart("Uncompress");
			log("Uncompressed length: " + decompressionResult.length);
			log(decompressionResult == randomString1M);
		}
	}
}