namespace ZincDB {
	export namespace ObjectTools {

		export const deepClone = function <T>(val: T, seenObjects: any[] = []): T {
			if (val == null || typeof val !== "object")
				return val;

			const obj = <any> val;
			const prototypeIdentifier = toString.call(obj);
			let clonedArray: any;

			switch (prototypeIdentifier) {
				case "[object Array]":
					if (seenObjects.indexOf(obj) >= 0)
						throw new Error("deepClone: encountered a cyclic object");
					
					seenObjects.push(obj);

					clonedArray = new Array(obj.length);

					for (let i = 0; i < obj.length; i++)
						clonedArray[i] = deepClone(obj[i], seenObjects);
					
					seenObjects.pop();

					return <any> clonedArray;
				case "[object ArrayBuffer]":
					clonedArray = new Uint8Array(obj.byteLength); 
					clonedArray.set(new Uint8Array(obj));
					return <any>clonedArray.buffer;
				case "[object Int8Array]":
					clonedArray = new Int8Array(obj.length); 
					clonedArray.set(obj);
					return <any>clonedArray;
				case "[object Uint8Array]":
					clonedArray = new Uint8Array(obj.length); 
					clonedArray.set(obj);
					return <any>clonedArray;
				case "[object Uint8ClampedArray]":
					clonedArray = new Uint8ClampedArray(obj.length); 
					clonedArray.set(obj);
					return <any>clonedArray;
				case "[object Int16Array]":
					clonedArray = new Int16Array(obj.length); 
					clonedArray.set(obj);
					return <any>clonedArray;
				case "[object Uint16Array]":
					clonedArray = new Uint16Array(obj.length); 
					clonedArray.set(obj);
					return <any>clonedArray;
				case "[object Int32Array]":
					clonedArray = new Int32Array(obj.length); 
					clonedArray.set(obj);
					return <any>clonedArray;
				case "[object Uint32Array]":
					clonedArray = new Uint32Array(obj.length); 
					clonedArray.set(obj);
					return <any>clonedArray;
				case "[object Float32Array]":
					clonedArray = new Float32Array(obj.length); 
					clonedArray.set(obj);
					return <any>clonedArray;
				case "[object Float64Array]":
					clonedArray = new Float64Array(obj.length); 
					clonedArray.set(obj);
					return <any>clonedArray;

				case "[object Date]":
					return <any> new Date(obj.valueOf());
				case "[object RegExp]":
					return Encoding.RegExpString.decode(Encoding.RegExpString.encode(obj));

				default:
					if (seenObjects.indexOf(obj) >= 0)
						throw new Error("deepClone: encountered a cyclic object");

					seenObjects.push(obj);
				
					const clonedObj: any = {};

					for (const propName in obj)
						if (obj.hasOwnProperty(propName))
							clonedObj[propName] = deepClone(obj[propName], seenObjects);
					
					seenObjects.pop();

					return clonedObj;
			}

		}
	}
}