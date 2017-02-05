namespace ZincDB {
	export namespace ObjectTools {
		export const deepContainsOmniJsonEncodables = function (obj: any): boolean {
			const predicate = (val: any): boolean => {
				if (val == null || typeof val !== "object")
					return false;

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
					case "[object Date]":
					case "[object RegExp]":
						return true;
					default:
						return false;
				}
			}

			return deepContains(obj, predicate);
		}
	}
}
