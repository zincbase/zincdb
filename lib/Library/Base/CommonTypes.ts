namespace ZincDB {
	export type Action = {
		(): void;
	}

	export type Predicate<T> = {
		(entry: T): boolean;
	}

	export type Comparer<T> = {
		(entry1: T, entry2: T): number;
	}

	export type ArraySegmentLocator = {
		startPosition: number;
		length: number;
	}

	export type IndexedCollection<T> = {
		[index: number]: T;
		length: number;
	}

	export type OffsetAndLength = {
		offset: number;
		length: number;
	}
}