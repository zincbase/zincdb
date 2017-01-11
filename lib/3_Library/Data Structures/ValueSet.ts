/// <reference path="List.ts"/>

namespace ZincDB {
	export class ValueSet<T> extends List<T>
	{
		constructor(initialElements?: T[], forceUnsafe?: boolean) {
			if (initialElements != null) {
				if (forceUnsafe) {
					super(initialElements);
				}
				else {
					super();
					this.addArray(initialElements);
				}
			}
			else
				super();
		}

		add(value: T) {
			if (!this.contains(value))
				super.add(value);
		}

		remove(value: T) {
			this.removeFirstMatch(value);
		}

		subtract(setToSubstract: ValueSet<T>): ValueSet<T> {
			return this.filter((element) => !setToSubstract.contains(element));
		}

		uniteWith(setToUniteWith: ValueSet<T>): ValueSet<T> {
			const result = new ValueSet<T>();

			result.addList(this);
			result.addList(setToUniteWith);

			return result;
		}

		intersectWith(setToIntersectWith: ValueSet<T>): ValueSet<T> {
			return this.filter((element) => setToIntersectWith.contains(element));
		}

		filter(predicate: (item: T) => boolean): ValueSet<T> {
			return new ValueSet(super.filter(predicate).elements, true);
		}

		transform(transformFunc: (item: T) => T) {
			throw new Error(`transform: Unsafe operation - use map instead`);
		}

		map(transformFunc: (item: T) => T): ValueSet<T> {
			return new ValueSet<T>(super.map(transformFunc).elements);
		}

		clone(): ValueSet<T> {
			return new ValueSet<T>(super.clone().elements, true);
		}
	}
}