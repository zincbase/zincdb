namespace ZincDB {
	export class ObjectBasedMap<V> implements Map<string, V>, Map<number, V>
	{
		private obj: { [key: string]: V | undefined } = {};
		size = 0;

		has(key: string | number) {
			return this.obj[key] !== undefined;
		}

		get(key: string | number): V | undefined {
			return this.obj[key];
		}

		set(key: string | number, newValue: V): this {
			if (!this.has(key))
				this.size++;

			this.obj[key] = newValue;

			return this;
		}

		delete(key: string | number): boolean {
			if (this.has(key)) {
				this.obj[key] = undefined;
				this.size--;

				return true;
			}

			return false;
		}

		clear() {
			for (const key in this.obj)
				this.obj[key] = undefined;

			this.size = 0;
		}

		forEach(func: (value: V, key: any, map: this) => void, thisArg?: any) {
			if (typeof func !== "function")
				throw new Error("Missing or invalid callback received");

			for (const key in this.obj)
				if (this.obj[key] !== undefined)
					func(<any> this.obj[key], key, this);
		}
		/*
		entries(): IterableIterator<[any, V]> {
			throw "Not implemented";
		}

		keys(): IterableIterator<any> {
			throw "Not implemented";
		}

		values(): IterableIterator<V> {
			throw "Not implemented";
		}

		[Symbol.iterator](): IterableIterator<[string, V]>
		{
			throw "Not implemented";
		}

		[Symbol.toStringTag]: "Map";
		*/
	}

	export var StringMap: { new <V>(): Map<string, V>; }
	export var NumberMap: { new <V>(): Map<number, V>; }

	if (typeof Map === "function") {
		StringMap = Map;
		NumberMap = Map;
	}
	else {
		StringMap = <any> ObjectBasedMap;
		NumberMap = <any> ObjectBasedMap;
	}
}
