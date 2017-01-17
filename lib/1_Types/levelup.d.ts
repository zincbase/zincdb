// Type definitions for LevelUp 
// Project: https://github.com/Level/levelup
// Definitions by: Bret Little <https://github.com/blittle>, Thiago de Arruda <https://github.com/tarruda>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

type MethodCallback = (error: any, value?: any) => any

declare namespace LevelUp {
	export type CustomEncoding = {
		encode(val: any): Buffer | string;
		decode(val: Buffer | string): any;
		buffer: boolean;
		type: string;
	}

	export type Encoding = "hex" | "utf8" | "ascii" | "binary" | "base64" | "ucs2" | "utf16le" | CustomEncoding;

	export type BatchOperation = {
		type: "put" | "del";
		key: any;
		value?: any;
		keyEncoding?: Encoding;
		valueEncoding?: Encoding;
	}

	export type ReadStreamOptions = {
		gt?: any;
		gte?: any;
		lt?: any;
		lte?: any;
		reverse?: boolean;
		keys?: boolean;
		values?: boolean;
		limit?: number;
		fillCache?: boolean;
		keyEncoding?: Encoding;
		valueEncoding?: Encoding;
	}

	export type BatchOptions = {
		keyEncoding?: Encoding; 
		valueEncoding?: Encoding; 
		sync?: boolean
	}

	export class Database {
		open(callback?: MethodCallback): void;
		close(callback?: MethodCallback): void;

		put(key: any, value: any, callback?: MethodCallback): void;
		put(key: any, value: any, options?: { sync?: boolean }, callback?: MethodCallback): void;

		get(key: any, callback?: MethodCallback): void;
		get(key: any, options?: { keyEncoding?: Encoding; fillCache?: boolean }, callback?: MethodCallback): void;
		
		del(key: any, callback?: MethodCallback): void;
		del(key: any, options?: { keyEncoding?: Encoding; sync?: boolean }, callback?: MethodCallback): void;

		batch(operations: BatchOperation[], options?: BatchOptions, callback?: MethodCallback): void;
		batch(operations: BatchOperation[], callback?: MethodCallback): void;
		batch(): BatchChain;

		isOpen(): boolean;
		isClosed(): boolean;

		createReadStream(options?: ReadStreamOptions): stream.Readable;
		createKeyStream(options?: ReadStreamOptions): stream.Readable;
		createValueStream(options?: ReadStreamOptions): stream.Readable;
	}

	export type BatchChain = {
		put(key: any, value: any): BatchChain;
		put(key: any, value: any, options?: { sync?: boolean }): BatchChain;
		del(key: any): BatchChain;
		del(key: any, options?: { keyEncoding?: Encoding; sync?: boolean }): BatchChain;
		clear(): BatchChain;
		write(callback?: (error?: any) => any): BatchChain;
	}

	export type ConstructionOptions = {
		createIfMissing?: boolean;
		errorIfExists?: boolean;
		compression?: boolean;
		cacheSize?: number;
		keyEncoding?: Encoding;
		valueEncoding?: Encoding;
		db?: string
	}

	function levelup(location: string, options?: LevelUp.ConstructionOptions): LevelUp.Database;
}

declare namespace LevelDown {
	export function destroy(location: string, callback?: MethodCallback): void;
	export function repair(location: string, callback?: MethodCallback): void;
}
