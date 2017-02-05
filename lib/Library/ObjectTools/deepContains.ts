namespace ZincDB {
	export namespace ObjectTools {
		export const deepContains = function (obj: any, predicate: (obj: any) => boolean, seenObjects: any[] = []): boolean {
			if (obj == null || typeof obj !== "object")
				return predicate(obj);

			const prototypeIdentifier = toString.call(obj);

			switch (prototypeIdentifier) {
				case "[object Array]":
					if (seenObjects.indexOf(obj) >= 0)
						throw new Error("deepContains: encountered a cyclic reference to an array");

					seenObjects.push(obj);
					for (let i = 0; i < (obj as any).length; i++) {
						if (deepContains(obj[i], predicate, seenObjects))
							return true;
					}
					seenObjects.pop();

					return false;
				case "[object Object]":
					if (seenObjects.indexOf(obj) >= 0)
						throw new Error("deepContains: encountered a cyclic reference to an object");

					seenObjects.push(obj);
					for (const propName in obj) {
						if (obj.hasOwnProperty(propName) && deepContains(obj[propName], predicate, seenObjects))
							return true;
					}
					seenObjects.pop();

					return false;

				default:
					return predicate(obj);
			}
		}
	}
}
