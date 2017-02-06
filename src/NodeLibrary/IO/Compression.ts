namespace ZincDB {
	export namespace Compression {
		if (runningInNodeJS()) {
			var NodeZlib: typeof zlib = require("zlib");
		}

		// Note: convenience methods like Zlib.gzip and Zlib.deflate cannot be easily used as they have
		// conflicting parameter layouts between Node 0.10 and later versions
		export const compressAsync = async function(input: any, encoding?: string, method: string = "gzip", compressionOptions?: zlib.ZlibOptions): Promise<any> {
			if (typeof input === "string")
				input = new Buffer(input, encoding);

			const compressionStream = createCompressionStream(method);
			compressionStream.end(input);

			return await StreamExtensions.readCompleteStream(<any>compressionStream);
		}

		export const decompressAsync = async function(compressedData: Buffer, decompressionOptions?: zlib.ZlibOptions): Promise<any> {
			const decompressionStream = createDecompressionStream(decompressionOptions);
			decompressionStream.end(compressedData);

			return await StreamExtensions.readCompleteStream(<any>decompressionStream);
		}

		export const createCompressionStream = function(method: string = "gzip", compressionOptions?: zlib.ZlibOptions): NodeJS.ReadWriteStream {
			if (method == "gzip")
				return NodeZlib.createGzip(compressionOptions);
			else if (method == "deflate")
				return NodeZlib.createDeflate(compressionOptions);
			else
				throw new Error("createCompressionStream: unsupported compression method");
		}

		export const createDecompressionStream = function(deompressionOptions?: zlib.ZlibOptions): NodeJS.ReadWriteStream {
			return NodeZlib.createUnzip(deompressionOptions);
		}
	}
}