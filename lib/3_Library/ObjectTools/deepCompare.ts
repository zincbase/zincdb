namespace ZincDB {
	export namespace ObjectTools {
		export const deepCompare = function (obj1: any, obj2: any, seenObjects: any[] = []): boolean {
			if (obj1 === obj2)
				return true;

			if (obj1 == null || obj2 == null)
				return false;

			if (typeof obj1 !== "object" || typeof obj2 !== "object") {
				if (typeof obj1 === "number" && typeof obj2 === "number" && isNaN(obj1) && isNaN(obj2))
					return true;
				else
					return false;
			}

			const prototypeIdentifier = toString.call(obj1);

			if (prototypeIdentifier !== toString.call(obj2))
				return false;

			switch (prototypeIdentifier) {
				case "[object Array]":
					if (seenObjects.indexOf(obj1) >= 0)
						throw new Error("deepCompare: encountered a cyclic object");

					seenObjects.push(obj1);
					if (obj1.length !== obj2.length)
						return false;

					for (let i = 0; i < obj1.length; i++) {
						if (deepCompare(obj1[i], obj2[i], seenObjects) === false)
							return false;
					}
					seenObjects.pop();

					return true;

				case "[object Int8Array]":
				case "[object Uint8Array]":
				case "[object Uint8ClampedArray]":
				case "[object Int16Array]":
				case "[object Uint16Array]":
				case "[object Int32Array]":
				case "[object Uint32Array]":
				case "[object Float32Array]":
				case "[object Float64Array]":
					if (obj1.length !== obj2.length)
						return false;

					for (let i = 0; i < obj1.length; i++) {
						if (obj1[i] !== obj2[i])
							return false;
					}

					return true;

				case "[object ArrayBuffer]":
					if (obj1.byteLength !== obj2.byteLength)
						return false;

					const bytes1 = new Uint8Array(obj1);
					const bytes2 = new Uint8Array(obj2);

					for (let i = 0; i < bytes1.length; i++) {
						if (bytes1[i] !== bytes2[i])
							return false;
					}

					return true;

				case "[object Date]":
					return obj1.valueOf() === obj2.valueOf();

				case "[object RegExp]":
					return Encoding.RegExpString.encode(obj1) === Encoding.RegExpString.encode(obj2);

				default: // Compare any other object
					if (seenObjects.indexOf(obj1) >= 0 )
						throw new Error("deepCompare: encountered a cyclic object");

					seenObjects.push(obj1);
					let obj1DefinedOwnPropertyCount = 0;
					for (const propName in obj1) {
						if (obj1.hasOwnProperty(propName) && obj1[propName] !== undefined) {
							if (!obj2.hasOwnProperty(propName))
								return false;
								
							if (deepCompare(obj1[propName], obj2[propName], seenObjects) === false)
								return false;

							obj1DefinedOwnPropertyCount++;
						}
					}
					seenObjects.pop();

					let obj2DefinedOwnPropertyCount = 0;
					for (const propName in obj2) {
						if (obj2.hasOwnProperty(propName) && obj2[propName] !== undefined)
							obj2DefinedOwnPropertyCount++;
					}

					return obj1DefinedOwnPropertyCount === obj2DefinedOwnPropertyCount;
			}
		}
	}
}