namespace ZincDB {
	export namespace StreamExtensions {
		if (runningInNodeJS()) {
			var NodeStream: typeof stream = require("stream");
		}	

		export const createPromiseForStream = async function(stream: stream.Writable | stream.Readable | stream.Duplex): Promise<void> {
			const streamPromise = new OpenPromise<void>();

			stream.on("end", () => streamPromise.resolve());
			stream.on("finish", () => streamPromise.resolve());
			stream.on("close", () => streamPromise.reject(new PromiseCanceledError()));
			stream.on("error", (error: any) => streamPromise.reject(error));

			await streamPromise;
			return;
		}

		export const readCompleteStream = async function(readableStream: stream.Readable, resultEncoding?: string, ignoreResult = false): Promise<any> {
			if (ignoreResult)
				return await readCompleteStreamAndIgnoreResult(readableStream);
			else
				return await readCompleteStreamAndReturnResult(readableStream, resultEncoding);
		}

		export const readCompleteStreamAndIgnoreResult = async function(readableStream: stream.Readable): Promise<void> {
			const streamPromise = new OpenPromise<void>();

			readableStream.on("data", (chunk: Buffer) => {
			});

			readableStream.on("end", () => {
				streamPromise.resolve();
			});

			readableStream.on("error", (error: any) => {
				streamPromise.reject(error);
			});

			readableStream.on("close", () => {
				streamPromise.reject(new PromiseCanceledError());
			});

			return await streamPromise;
		}

		export const readCompleteStreamAndReturnResult = async function(readableStream: stream.Readable, resultEncoding?: string): Promise<Buffer | string> {
			const streamPromise = new OpenPromise<Buffer | string>();
			let chunks: Buffer[] = [];

			readableStream.on("data", (chunk: Buffer) => {
				chunks.push(chunk);
			});

			readableStream.on("end", () => {
				const joinedChunks = Buffer.concat(chunks);
				chunks = [];

				if (resultEncoding == undefined)
					streamPromise.resolve(joinedChunks)
				else
					streamPromise.resolve(joinedChunks.toString(resultEncoding));
			});

			readableStream.on("error", (e: any) => {
				chunks = [];
				streamPromise.reject(e);
			});

			readableStream.on("close", () => {
				chunks = [];
				streamPromise.reject(new PromiseCanceledError());
			});

			return await streamPromise;
		}

		export const createEmptyReadStream = function(): stream.Readable {
			const stream = new NodeStream.Readable();
			stream.push(null);
			return stream;
		}
	}
} 