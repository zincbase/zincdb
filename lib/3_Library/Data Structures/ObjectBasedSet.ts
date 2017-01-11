namespace ZincDB {
	export class ObjectBasedSet implements Set<string>, Set<number>
	{
		private obj: { [key: string]: boolean } = {};
		size = 0;

		has(key: string | number): boolean {
			return this.obj[key] !== undefined;
		}

		add(key: string | number): this {
			if (!this.has(key)) {
				this.obj[key] = true;
				this.size++;
			}

			return this;
		}

		delete(key: string | number): boolean {
			if (this.has(key)) {
				this.obj[key] = <any> undefined;
				this.size--;

				return true;
			}

			return false;
		}

		clear() {
			for (const key in this.obj)
				this.obj[key] = <any> undefined;

			this.size = 0;
		}

		forEach(func: (key: string | number) => void, thisArg?: any) {
			if (typeof func !== "function")
				throw new Error("Missing or invalid callback received");

			for (const key in this.obj)
				if (this.obj[key] !== undefined)
					func(key);
		}

		/*
		keys(): IterableIterator<any> {
			throw "Not implemented";
		}

		values(): IterableIterator<any> {
			throw "Not implemented";
		}

		entries(): IterableIterator<[any, any]> {
			throw "Not implemented";
		}
		
		[Symbol.iterator](): IterableIterator<string>
		{
			throw "Not implemented";
		}

		[Symbol.toStringTag]: "Set";
		*/
	}

	export var StringSet: { new (): Set<string>; }
	export var NumberSet: { new (): Set<number>; }

	if (typeof Set === "function") {
		StringSet = Set;
		NumberSet = Set;
	}
	else {
		StringSet = ObjectBasedSet;
		NumberSet = ObjectBasedSet;
	}
} 