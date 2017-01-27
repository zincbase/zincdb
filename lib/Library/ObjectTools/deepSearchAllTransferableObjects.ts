namespace ZincDB {
	export namespace ObjectTools {
		export const deepSearchTransferableObjects = function (obj: any): ArrayBuffer[] {
			const reducer = (val: any, currentResult: number[]): any[] => {
				if (val == null || typeof val !== "object")
					return currentResult;
				
				const prototypeIdentifier = toString.call(val);

				switch (prototypeIdentifier) {
					case "[object ArrayBuffer]":
						if (currentResult.indexOf(val) === -1) {
							return currentResult.concat(val);
						}
						break;
					case "[object Int8Array]":
					case "[object Uint8Array]":
					case "[object Uint8ClampedArray]":
					case "[object Int16Array]":
					case "[object Uint16Array]":
					case "[object Int32Array]":
					case "[object Uint32Array]":
					case "[object Float32Array]":
					case "[object Float64Array]":
						if (currentResult.indexOf(val.buffer) === -1) {
							return currentResult.concat(val.buffer);
						}
						
						break;
				}

				return currentResult;
			}

			return deepReduce(obj, reducer, []);
		}
	}
}