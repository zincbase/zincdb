interface Symbol {
    /** Returns a string representation of an object. */
    toString(): string;

    /** Returns the primitive value of the specified object. */
    valueOf(): Object;
}

interface SymbolConstructor {
    /** 
      * A reference to the prototype. 
      */
    readonly prototype: Symbol;

    /**
      * Returns a new unique Symbol value.
      * @param  description Description of the new Symbol object.
      */
    (description?: string|number): symbol;

    /**
      * Returns a Symbol object from the global symbol registry matching the given key if found. 
      * Otherwise, returns a new symbol with this key.
      * @param key key to search for.
      */
    for(key: string): symbol;

    /**
      * Returns a key from the global symbol registry matching the given Symbol if found. 
      * Otherwise, returns a undefined.
      * @param sym Symbol to find the key for.
      */
    keyFor(sym: symbol): string | undefined;
}

interface SymbolConstructor {
    /** 
      * A method that returns the default iterator for an object. Called by the semantics of the 
      * for-of statement.
      */
    readonly iterator: symbol;
}

declare var Symbol: SymbolConstructor;

interface IteratorResult<T> {
    done: boolean;
    value: T;
}

interface Iterator<T> {
    next(value?: any): IteratorResult<T>;
    return?(value?: any): IteratorResult<T>;
    throw?(e?: any): IteratorResult<T>;
}

interface Iterable<T> {
    [Symbol.iterator](): Iterator<T>;
}

interface IterableIterator<T> extends Iterator<T> {
    [Symbol.iterator](): IterableIterator<T>;
}

interface Array<T> {
	[Symbol.iterator](): IterableIterator<T>;	
}