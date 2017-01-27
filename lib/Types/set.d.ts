interface Set<T> {
	add(value: T): this;
	clear(): void;
	delete(value: T): boolean;
	forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void;
	has(value: T): boolean;
	readonly size: number;
}

interface SetConstructor {
	new (): Set<any>;
	new <T>(values?: T[]): Set<T>;
	readonly prototype: Set<any>;
}

declare var Set: SetConstructor;