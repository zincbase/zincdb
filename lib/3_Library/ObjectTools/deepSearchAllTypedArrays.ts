namespace ZincDB {
	export namespace ObjectTools {
		export const deepSearchAllTypedArrays = function (obj: any): any[] {
			const reducer = (val: any, currentResult: number[]): any[] => {
				if (val == null || typeof val !== "object")
					return currentResult;
				
				const prototypeIdentifier = toString.call(val);

				switch (prototypeIdentifier) {
					case "[object ArrayBuffer]":
					case "[object Int8Array]":
					case "[object Uint8Array]":
					case "[object Uint8ClampedArray]":
					case "[object Int16Array]":
					case "[object Uint16Array]":
					case "[object Int32Array]":
					case "[object Uint32Array]":
					case "[object Float32Array]":
					case "[object Float64Array]":
						return currentResult.concat(val);
					default:
						return currentResult;
				}
			}

			return deepReduce(obj, reducer, []);
		}
	}
}