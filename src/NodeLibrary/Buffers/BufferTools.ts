namespace ZincDB {
	export namespace BufferTools {
		export const sliceBufferArray = function(buffers: Buffer[], startOffset: number): Buffer[] {
			if (buffers.length === 0)
				return [];

			if (buffers.length === 1)
				return [buffers[0].slice(startOffset)];

			let cumulativeOffset = 0;

			for (let i = 0; i < buffers.length; i++) {
				if (startOffset < cumulativeOffset + buffers[i].length) {
					const slicedBuffer = buffers[i].slice(startOffset - cumulativeOffset);
					return [slicedBuffer].concat(buffers.slice(i + 1));
				}
				else {
					cumulativeOffset += buffers[i].length;
				}
			}

			return [];
		}

		export const xorBuffers = function(buffer1: Buffer, buffer2: Buffer): Buffer {
			const result = new Buffer(Math.min(buffer1.length, buffer2.length));

			for (let i = 0; i < result.length; i++)
				result[i] = buffer1[i] ^ buffer2[i];

			return result;
		}

		export const uint8ArrayToBuffer = function(arr: Uint8Array): Buffer {
			if (Buffer.prototype instanceof Uint8Array) {
				// A simple technique based on how buffer objects are created in node 3/4+
				// See: https://github.com/nodejs/node/blob/627524973a22c584fdd06c951fbe82364927a1ed/lib/buffer.js#L67

				const arrClone = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength)
				Object["setPrototypeOf"](arrClone, Buffer.prototype);
				return <any>arrClone;
			}
			else {
				const len = arr.length;
				const buf = new Buffer(len);

				for (let i = 0; i < len; i++)
					buf[i] = arr[i];

				return buf;
			}
		}

		export const bufferToUint8Array = function(buf: Buffer): Uint8Array {
			if (Buffer.prototype instanceof Uint8Array) {
				return new Uint8Array(buf["buffer"], buf["byteOffset"], buf["byteLength"]);
			}
			else {
				const len = buf.length;
				const arr = new Uint8Array(len);

				for (let i = 0; i < len; i++)
					arr[i] = buf[i];

				return arr;
			}
		}

		export const bufferToInt32Array = function(buf: Buffer): Int32Array {
			if (Buffer.prototype instanceof Uint8Array) {
				return new Int32Array(buf["buffer"], buf["byteOffset"], buf["byteLength"] / 4);
			}
			else {
				return new Int32Array(bufferToUint8Array(buf).buffer);
			}
		}
	}
}