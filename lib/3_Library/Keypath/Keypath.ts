namespace ZincDB {
	export namespace Keypath {
		//const getObjectType = (o: any): string => Object.prototype.toString.call(o);

		export type Keypath = (string | number)[];
		export type EntityPath = Keypath;		
		export type KeypathAndValue = { path: Keypath, value: any };
		export type NodePath = string[];

		const specifierRegExp = /^\[('[^']*')+\]|^\[([0-9]+)\]/;

		export const parse = function(keypathString: string): Keypath {
			if (typeof keypathString !== "string")
				throw new Error("Keypath argument is missing or not a string");
			
			if (keypathString === "")
				return [];
				
			const parsedKeypath: Keypath = [];

			let remainderString = keypathString;
			let offset = 0;

			while (remainderString.length > 0) {
				const match = specifierRegExp.exec(remainderString);
				
				if (match == null)
					throw new Error(`Invalid keypath '${keypathString}'. Parser error at offset ${offset}. No match found.`);
				
				const matchLength = match[0].length;

				if (match[0][1] === "'") {
					const specifierString = match[0].substring(2, matchLength - 2);

					// match[1] contains the last quoted identifier in the chain. For example:
					// match[0]: ['hello''world']
					// specifierString: hello''world
					// match[1]: 'world'

					// Check if there is only one quoted identifier
					if (specifierString.length === match[1].length - 2)
						parsedKeypath.push(specifierString);
					else
						parsedKeypath.push(specifierString.replace(/''/g,"'"));
				} else {
					parsedKeypath.push(parseInt(match[2]));
				}

				remainderString = remainderString.substr(matchLength);
				offset += matchLength;
			}

			return parsedKeypath;
		}

		export const stringifyPaths = function(paths: Keypath[]): string[] {
			return paths.map((path) => stringify(path));
		}

		export const stringify = function(keypath: Keypath): string {
			if (!Array.isArray(keypath))
				throw new TypeError("The given argument is not an array");
			
			if (keypath.length === 0)
				return "";
				
			let result = "";

			for (const key of keypath) {
				const keyType = typeof key;

				if (keyType === "string")
					result += `['${(<string>key).replace(/'/g, "''")}']`;
				else if (keyType === "number")
					result += `[${key}]`;
				else
					throw new Error(`Encountered an invalid key type in keypath ${keypath}`);
			}

			return result;
		}

		export const flattenObjectTree = function(obj: any, result: KeypathAndValue[] = [], keypath: Keypath = []): KeypathAndValue[] {
			const objType = typeof obj;

			if (obj === undefined)
				throw new Error("Undefined object received")

			if (obj === null || objType === "string" || objType === "number" || objType === "boolean" || obj instanceof Uint8Array) {
				// Error when the tree root is a primitive object
				if (keypath.length === 0)
					throw new Error("Tree root can only be a simple object or array type.");

				result.push({ path: keypath, value: obj });
			} else if (obj instanceof Array) {
				if (obj.length === 0) {
					result.push({ path: keypath, value: [] });
				} else {
					for (let i = 0; i < obj.length; i++) {
						const value = obj[i];

						// Ignore explicit undefined values
						if (value === undefined)
							continue;

						flattenObjectTree(value, result, keypath.concat([i]));
					}
				}
			} else if (objType === "object") {
				// Error on objects with prototypes
				if (Object.getPrototypeOf(obj) !== Object.prototype)
					throw new Error("Tree objects cannot have prototypes other than 'Object'.");

				let keyCount = 0;
				for (const key in obj) {
					// Ignore strange keys like null or undefined
					if (key == null)
						continue;

					const value = obj[key];

					// Ignore explicit undefined values
					if (value === undefined)
						continue;

					flattenObjectTree(value, result, keypath.concat(key));
					keyCount++;
				}

				if (keyCount === 0)
					result.push({ path: keypath, value: {} });
			} else {
				throw new TypeError("Unsupported value type encountered")
			}

			return result;
		}

		export const flattenObjectTreeAndConvertToEntries = function(obj: any): DB.EntryArray<any> {
			return flattenObjectTree(obj).map<DB.Entry<any>>((keypathAndValue) => {
				return {
					key: stringify(keypathAndValue.path),
					value: keypathAndValue.value,
					metadata: {}
				}
			});
		}

		export const unflattenObjectTree = function(flattenedObjectTree: KeypathAndValue[]): any {
			let obj: any = undefined;

			for (const leaf of flattenedObjectTree) {
				obj = patchObject(obj, leaf.path, leaf.value);
			}

			return obj;
		}

		export const patchObject = function(obj: any, keypath: Keypath, value: any, keypathOffset = 0): any {
			const keypathLength = keypath.length;

			if (keypathLength === 0)
				throw new Error("Zero length keypath array given.");

			const key = keypath[keypathOffset];

			if (typeof key === "number") {
				if (!(obj instanceof Array))
					obj = [];
			} else {
				if (typeof obj !== "object" || obj instanceof Array)
					obj = {};
			}

			if (keypathOffset === keypathLength - 1)
				obj[key] = value;
			else
				obj[key] = patchObject(obj[key], keypath, value, keypathOffset + 1);

			return obj;
		}

		export const patchImmutableObject = function(obj: any, keypath: Keypath, value: any, keypathOffset = 0): any {
			const keypathLength = keypath.length;

			if (keypathLength === 0)
				throw new Error("Zero length keypath array given.");

			const key = keypath[keypathOffset];

			if (typeof key === "number") {
				if (!(obj instanceof Array))
					obj = [];
				else
					obj = obj.slice(0);
			} else {
				if (typeof obj !== "object" || obj instanceof Array)
					obj = {};
				else
					obj = { ...obj };
			}

			if (keypathOffset === keypathLength - 1)
				obj[key] = value;
			else
				obj[key] = patchImmutableObject(obj[key], keypath, value, keypathOffset + 1);

			return obj;
		}

		export const diffObjects = function(sourceObj: any, destObj: any): DB.EntryArray<any> {
			// Note that this could be improved to use the array based keypaths directly as keys in the map
			// However this would require some ES6 support in the platform

			const flattenedSourceObj = flattenObjectTreeAndConvertToEntries(sourceObj);
			const flattenedDestObj = flattenObjectTreeAndConvertToEntries(destObj);

			const flattenedSourceObjMap = new StringMap<any>();

			for (const sourceLeaf of flattenedSourceObj) {
				flattenedSourceObjMap.set(sourceLeaf.key, sourceLeaf.value);
			}

			const flattenedDestObjMap = new StringMap<any>();

			for (const destLeaf of flattenedDestObj) {
				flattenedDestObjMap.set(destLeaf.key, destLeaf.value);
			}

			const changes: DB.EntryArray<any> = [];

			for (const sourceLeaf of flattenedSourceObj) {
				if (!flattenedDestObjMap.has(sourceLeaf.key))
					changes.push({ key: sourceLeaf.key, value: undefined, metadata: {} });
			}

			for (const destLeaf of flattenedDestObj) {
				const sourceValue = flattenedSourceObjMap.get(destLeaf.key);

				if (sourceValue === undefined || !ObjectTools.deepCompare(sourceValue, destLeaf.value))
					changes.push(destLeaf);
			}

			return changes;
		}

		export const enum Relationship { None, Equal, Ancestor, Descendant };

		export const determineRelationship = function(keypath1: Keypath, keypath2: Keypath): Relationship {
			const compareElements = (count: number) => {
				for (let i = 0; i < count; i++) {
					if (keypath1[i] !== keypath2[i])
						return false;			
				}

				return true;	
			}

			// Note the arguments are not checked to be valid encoded keypaths
			if (keypath1.length === keypath2.length) {
				if (compareElements(keypath1.length))
					return Relationship.Equal;
				else
					return Relationship.None;
			} else if (keypath1.length < keypath2.length) {
				if (compareElements(keypath1.length))
					return Relationship.Ancestor;
				else
					return Relationship.None;
			} else {
				if (compareElements(keypath2.length))
					return Relationship.Descendant;
				else
					return Relationship.None;
			}
		}
		
		export const determineStringRelationship = function(keypath1: string, keypath2: string): Relationship {
			// Note the arguments are not checked to be valid encoded keypaths
			if (keypath1.length === keypath2.length) {
				if (keypath1 === keypath2)
					return Relationship.Equal;
				else
					return Relationship.None;
			} else if (keypath1.length < keypath2.length) {
				if (keypath1 === keypath2.substr(0, keypath1.length))
					return Relationship.Ancestor;
				else
					return Relationship.None;
			} else {
				if (keypath1.substr(0, keypath2.length) === keypath2)
					return Relationship.Descendant;
				else
					return Relationship.None;
			}
		}

		export const areEqual = function(keypath1: Keypath, keypath2: Keypath): boolean {
			if (keypath1 === keypath2)
				return true;
				 
			if (keypath1.length !== keypath2.length)
				return false;

			for (let i = 0; i < keypath1.length; i++) {
				if (keypath1[i] !== keypath2[i])
					return false;
			}

			return true;
		}

		export const compare = function(keypath1: Keypath, keypath2: Keypath): number {
			// If one specifier is number and the other is string, the number is always considered greater.
			// This is to be consistent with the lexicographical sort of the string encoding:
			// The character ' is smaller than all numberic digits, e.g:
			// ['hello'] 
			// <
			// [0]

			const shorterKeypathLength = Math.min(keypath1.length, keypath2.length);

			for (let i = 0; i < shorterKeypathLength; i++) {
				const specifier1 = keypath1[i];
				const specifier2 = keypath2[i];

				const type1 = typeof specifier1;
				const type2 = typeof specifier2;

				if (type1 !== type2) {
					if (type1 === "string")
						return -1;
					else
						return 1;
				}

				if (specifier1 < specifier2)
					return -1;
				else if (specifier1 > specifier2)
					return 1;
			}

			if (keypath1.length === keypath2.length)
				return 0;
			else if (keypath1.length === shorterKeypathLength)
				return -1;
			else
				return 1;
		}

		export const formatPath = function(path: Keypath | string) {
			if (typeof path === "string") {
				return JSON.stringify(parse(path));
			} else {
				return JSON.stringify(path);
			}
		}

		export const getValueByKeypath = function(obj: any, keypath: Keypath) {
			if (keypath.length === 0)
				return obj;

			let result = obj;
			for (const specifier of keypath) {
				if (typeof result !== "object")
					return undefined;

				if (Array.isArray(result)) {
					if (typeof specifier !== "number")
						return undefined;
				} else {
					if (typeof specifier !== "string")
						return undefined;
				}

				result = result[specifier];
			}

			return result;
		}
	}
}
