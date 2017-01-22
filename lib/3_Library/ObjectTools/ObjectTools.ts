namespace ZincDB {
	export namespace ObjectTools {
		export const getKeys = function(obj: any): string[] {
			const keys: string[] = [];

			for (const key in obj)
				keys.push(key);

			return keys;
		}

		export const setPrototype = function<T>(obj: T, prototype: any, forceClone?: boolean): T {
			if (!forceClone && typeof Object["setPrototypeOf"] === "function") {
				Object["setPrototypeOf"](obj, prototype);
				return obj;
			}
			if (forceClone || !obj["__proto__"]) {
				var clonedObject = Object.create(prototype);

				for (const property in obj)
					if (obj.hasOwnProperty(property))
						clonedObject[property] = obj[property];

				return clonedObject;
			}
			else {
				obj["__proto__"] = prototype;
				return obj;
			}
		}

		export const override = function<T extends V, V>(obj: T, newPropertyValues: V): T {
			return extend(obj, newPropertyValues);
		}

		export const extend = function<T, V>(obj: T, newProperties: V): T & V {
			if (obj == null)
				throw new TypeError("obj is null or undefined");

			if (typeof obj !== "object")
				throw new TypeError("obj is not an object");

			if (newProperties == null)
				newProperties = <any>{};

			if (typeof newProperties !== "object")
				throw new TypeError("newProperties is not an object");

			if (newProperties != null) {
				for (const property in newProperties)
					obj[<string> property] = newProperties[property];
			}

			return <T & V>obj;
		}

		export const merge = function<T, V>(base: T, extensions: V): T & V {
			if (base == null)
				base = <any>{};

			return extend(shallowClone(base), extensions);
		}

		export const shallowClone = function<T>(obj: T, copyPrototype = false): T {
			if (obj == null)
				throw new TypeError("obj is null or undefined");

			if (typeof obj !== "object")
				throw new TypeError("obj is not an object");

			if (copyPrototype)
				var clonedObj: any = Object.create(Object.getPrototypeOf(obj));
			else
				var clonedObj: any = {};

			for (const property in obj)
				if (obj.hasOwnProperty(property))
					clonedObj[property] = obj[property];

			return clonedObj;
		}

		export const objectHasAtLeastOneDefinedProperty = function(obj: any): boolean {
			if (typeof obj !== "object")
				return false;

			for (const prop in obj) {
				if (obj[prop] !== undefined)
					return true;
			}

			return false;
		}

		// Note: doesn't freeze prototypes, functions, typed arrays or other non-trivial members. 
		export const deepFreezeSimpleObject = function(obj: any, maxDepth?: number, depth = 0) {
			if (depth === maxDepth)
				throw new Error(`deepCloneSimpleObject: object was iterated up to the maximum depth of ${maxDepth}, it might be cyclic.`);

			if (obj == null)
				return;

			const typeofObj = typeof obj;

			if (typeofObj === "number" || typeofObj === "string" || typeofObj === "boolean") {
				//Object.freeze(obj);
			}
			else if (Array.isArray(obj)) {
				const arrayLength = obj.length;

				for (let i = 0; i < arrayLength; i++)
					deepFreezeSimpleObject(obj[i], depth + 1);

				Object.freeze(obj);
			}
			else if (typeofObj === "object") {
				for (const property in obj)
					deepFreezeSimpleObject(obj[property], depth + 1);
			}
			else if (typeofObj == "function")
				throw new Error(`deepFreezeSimpleObject: encountered a unspported function member on depth ${depth}`);
			else
				throw new Error(`deepFreezeSimpleObject: encountered an unknown type on depth ${depth}`);
		}

		export const objectToArray = function<T>(obj: { [key: string]: T }): T[] {
			var result: T[] = [];

			for (const property in obj) {
				var propertyValue = obj[property];

				if (propertyValue !== undefined)
					result.push(propertyValue);
			}

			return result;
		}

		export const renameObjectProperty = function(obj: any, oldPropertyName: string, newPropertyName: string) {
			obj[newPropertyName] = obj[oldPropertyName];

			if (newPropertyName !== oldPropertyName)
				delete obj[oldPropertyName];
		}

		export const deleteObjectProperty = function(obj: any, propertyName: string) {
			delete obj[propertyName];
		}

		export const countOwnDefinedPropertiesInObject = function(obj: any): number {
			let count = 0;

			for (const property in obj)
				if (obj.hasOwnProperty(property))
					count++;

			return count;
		}

		export const countDefinedOwnPropertiesInObject = function(obj: any): number {
			let count = 0;

			for (const property in obj)
				if (obj.hasOwnProperty(property) && obj[property] !== undefined)
					count++;

			return count;
		}

		let propertyNameCache: Map<any, string[]>;

		export const getAllPropertyNames = function(obj: any): string[] {
			const scanAllPropertyNames = (): string[] => {
				const propertyNames: string[] = [];

				while (obj != null) {
					Array.prototype.push.apply(propertyNames, Object.getOwnPropertyNames(obj));
					obj = Object.getPrototypeOf(obj);
				}

				return propertyNames;
			}

			if (typeof Map === "function") {
				if (propertyNameCache === undefined)
					propertyNameCache = new Map<any, string[]>();

				let names = propertyNameCache.get(obj);

				if (names === undefined) {
					names = scanAllPropertyNames();
					propertyNameCache.set(obj, names);
				}

				return names;
			}
			else {
				return scanAllPropertyNames();
			}
		}

		export const memberNameof = function(container: any, member: any): string {
			if (container == null && typeof container !== "function" && typeof container !== "object")
				throw new TypeError("memberNameOf only works with non-null object or function containers");

			if (member == null && typeof member !== "function" && typeof member !== "object")
				throw new TypeError("memberNameOf only works with non-null object or function values");

			for (const propName of getAllPropertyNames(container))
				if (container[propName] === member)
					return propName;

			throw new Error("A member with the given value was not found in the container object or any of its prototypes");
		}

		export const createMemberNameProvider = function(container: any): (member: any) => string {
			return (member: any) => memberNameof(container, member);
		}

		export const addMethodNameProperties = function (obj: any) {
			while (obj != null && obj !== Function.prototype && obj !== Object.prototype) {
				for (const propName of Object.getOwnPropertyNames(obj)) {
					if (propName === "constructor")
						continue;

					const member = obj[propName];

					if (typeof member === "function") {
						Object.defineProperty(member, "methodName", {
							enumerable: false,
							configurable: true,
							writable: false,
							value: propName
						});
					}
				}

				obj = Object.getPrototypeOf(obj);
			}
		}
	}
}