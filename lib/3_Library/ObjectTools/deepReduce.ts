namespace ZincDB {
	export namespace ObjectTools {
		export const deepReduce = function <T, R>(obj: T, reducer: (obj: T, currentResult: R) => R, currentResult: R, seenObjects: any[] = []): R {
			if (obj == null || typeof obj !== "object")
				return reducer(obj, currentResult);

			const prototypeIdentifier = toString.call(obj);

			switch (prototypeIdentifier) {
				case "[object Array]":
					if (seenObjects.indexOf(obj) >= 0)
						throw new Error("deepReduce: encountered a cyclic object");

					seenObjects.push(obj);

					for (let i = 0; i < (obj as any).length; i++) {
						currentResult = deepReduce(obj[i], reducer, currentResult, seenObjects);
					}

					return currentResult;
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
				case "[object Date]":
				case "[object RegExp]":
					return reducer(obj, currentResult);
				default:
					if (seenObjects.indexOf(obj) >= 0)
						throw new Error("deepReduce: encountered a cyclic object");

					seenObjects.push(obj);				

					for (const propName in obj) {
						if (obj.hasOwnProperty(propName))
							currentResult = deepReduce<any, R>(obj[propName], reducer, currentResult, seenObjects);
					}
					
					return currentResult;
			}
		}
	}
}