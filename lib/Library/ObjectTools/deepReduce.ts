namespace ZincDB {
	export namespace ObjectTools {
		export const deepReduce = function <T, R>(obj: T, reducer: (obj: T, currentResult: R) => R, currentResult: R, seenObjects: any[] = []): R {
			if (obj == null || typeof obj !== "object")
				return reducer(obj, currentResult);

			const prototypeIdentifier = toString.call(obj);

			switch (prototypeIdentifier) {
				case "[object Array]":
					if (seenObjects.indexOf(obj) >= 0)
						throw new Error("deepReduce: encountered a cyclic reference to an array");

					seenObjects.push(obj);
					for (let i = 0; i < (obj as any).length; i++) {
						currentResult = deepReduce(obj[i], reducer, currentResult, seenObjects);
					}
					seenObjects.pop();

					return currentResult;
				case "[object Object]":
					if (seenObjects.indexOf(obj) >= 0)
						throw new Error("deepReduce: encountered a cyclic reference to an object");

					seenObjects.push(obj);
					for (const propName in obj) {
						if (obj.hasOwnProperty(propName))
							currentResult = deepReduce<any, R>(obj[propName], reducer, currentResult, seenObjects);
					}
					seenObjects.pop();

					return currentResult;

				default:
					return reducer(obj, currentResult);
			}
		}
	}
}