namespace ZincDB {
	export namespace Crypto {
		export interface AES_CTR_Generic {
			key: number[];
			transformBytes(input: Uint8Array, inputStartOffset: number, output: Uint8Array, outputOffset: number, count: number): void;
			transformBytesInPlace(input: Uint8Array, startOffset?: number, count?: number): void;
			reset(nonce: number[], counter?: number): void;
		}
	}
}