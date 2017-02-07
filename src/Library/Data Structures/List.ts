namespace ZincDB {
	export class List<T> {
		constructor(public elements: T[] = []) {
		}

		get(index: number): T {
			return this.elements[index];
		}

		set(index: number, newValue: T) {
			this.elements[index] = newValue;
		}

		get length(): number {
			return this.elements.length;
		}

		add(item: T) {
			this.elements.push(item);
		}

		addArray(items: T[]) {
			for (let item of items)
				this.add(item);
		}

		addList(list: List<T>) {
			this.addArray(list.elements);
		}

		addFromFunction(func: (index: number) => T, count: number) {
			for (let i = 0; i < count; i++)
				this.add(func(i));
		}

		addFirst(value: T) {
			this.elements.unshift(value);
		}

		clear() {
			this.elements.length = 0;
		}

		clone(): List<T> {
			return this.slice(0);
		}

		forEach(action: (item: T, index?: number) => void) {
			for (let i = 0, length = this.length; i < length; i++)
				action(this.elements[i], i);
		}

		filter(predicate: Predicate<T>): List<T> {
			const result = new List<T>();

			for (let item of this.elements) {
				if (predicate(item))
					result.add(item);
			}

			return result;
		}

		contains(value: T): boolean {
			return this.indexOf(value) !== -1;
		}

		indexOf(value: T, startIndex = 0): number {
			for (let i = startIndex, length = this.elements.length; i < length; i++)
				if (this.elements[i] === value)
					return i;

			return -1;
		}

		findFirstMatchIndex(predicate: Predicate<T>): number {
			for (let i = 0; i < this.elements.length; i++)
				if (predicate(this.elements[i]))
					return i;

			return -1;
		}

		findFirstMatch(predicate: Predicate<T>): T {
			return this.elements[this.findFirstMatchIndex(predicate)];
		}

		removeRange(startIndex: number, count: number = 1): List<T> {
			return new List<T>(this.elements.splice(startIndex, count));
		}

		removeFirstMatch(value: T): boolean {
			let index = this.indexOf(value);

			if (index >= 0) {
				this.removeRange(index);
				return true;
			}
			else {
				return false;
			}
		}

		removeFirst(): T | undefined {
			return this.elements.shift();
		}

		removeLast(): T | undefined {
			return this.elements.pop();
		}

		get first(): T {
			return this.elements[0];
		}

		get last(): T {
			return this.elements[this.length - 1];
		}

		slice(start?: number, end?: number): List<T> {
			return new List<T>(this.elements.slice(start, end));
		}

		transform(transformFunc: (item: T, index?: number) => T) {
			for (let i = 0; i < this.length; i++)
				this.elements[i] = transformFunc(this.elements[i], i)
		}

		map<R>(transformFunc: (item: T, index?: number) => R): List<R> {
			const result = new List<R>();
			this.forEach((item: T, index: number) => result.add(transformFunc(item, index)));
			return result;
		}

		getWhile(predicate: Predicate<T>): List<T> {
			const result = new List<T>();

			for (let i = 0; i < this.length && predicate(this.elements[i]); i++)
				result.add(this.elements[i]);

			return result;
		}

		reverse() {
			const elements = this.elements;

			let left = 0;
			let right = elements.length - 1;
			let temp;

			while (left < right) {
				temp = elements[left];
				elements[left] = elements[right];
				elements[right] = temp;

				left += 1;
				right -= 1;
			}
		}

		getReversed(): List<T> {
			const result = this.clone();
			result.reverse();
			return result;
		}

		join(separator: string): string {
			return this.elements.join(separator);
		}

		allSatisfy(predicate: Predicate<T>): boolean {
			for (let i = 0; i < this.length; i++)
				if (!predicate(this.elements[i]))
					return false;

			return true;
		}

		reduce<A>(operation: (item: T, accumulator: A) => A, initialValue: A): A {
			let accumulator = initialValue;

			this.forEach((item: T) => {
				accumulator = operation(item, accumulator);
			});

			return accumulator;
		}

		async reduceAsync<A>(operation: (item: T, accumulator: A) => A, initialValue: A): Promise<A> {
			let accumulator = initialValue;

			await this.forEachAsync((item: T) => { accumulator = operation(item, accumulator); });
			return accumulator;
		}

		async forEachAsync(func: (element: T, index?: number) => void, maxInterval = 20): Promise<void> {
			const timer = new Timer();

			for (let i = 0; i < this.elements.length; i++) {
				func(this.elements[i], i);

				if (timer.getElapsedTime() >= maxInterval) {
					await PromiseX.yield();
					timer.restart();
				}
			}
		}

		// Filter the list asynchronously
		async filterAsync(filteringPredicate: Predicate<T>, maxInterval = 20): Promise<any> {
			if (!filteringPredicate)
				return this.clone();

			const results: List<T> = new List<T>();

			const filterElement = (element: T) => {
				if (filteringPredicate(element))
					results.add(element);
			}

			await this.forEachAsync(filterElement, maxInterval);
			return results;
		}

		async mapAsync<R>(transformFunc: (element: T, index?: number) => R, maxInterval = 20): Promise<List<R>> {
			const results = new List<R>();
			await this.forEachAsync((value, index) => results.add(transformFunc(value, index)), maxInterval);

			return results;
		}

		addRepeatedly(computation: () => T, count: number) {
			for (let i = 0; i < count; i++)
				this.add(computation());
		}

		sort(comparer: Comparer<T>) {
			//this.sortAsync(comparer, Infinity).startSync();
			this.elements.sort(comparer);
		}

		async sortAsync(comparer: Comparer<T>, timeout: number = 20): Promise<void> {
			// Note: this sort is stable (equal values will always be kept in original order)
			const elements = this.elements;

			const rangeInsertionSort = (leftIndex: number, rightIndex: number) => {
				for (let i = leftIndex + 1; i <= rightIndex; i++) {
					const value = elements[i];

					let j = i - 1;
					for (j; j >= leftIndex && comparer(elements[j], value) > 0; j--)
						elements[j + 1] = elements[j];

					elements[j + 1] = value;
				}
			}

			const partitionStack = [0, elements.length - 1];

			let leftIndex: number, rightIndex: number, pivotValue: T, smallerThanPivotStorageIndex: number, writeIndex: number;
			const equalToPivot: T[] = [], largerThanPivot: T[] = [];
			let equalToPivotCount: number, largerThanPivotCount: number;

			const timer = new Timer();
			let comparisonCount: number = 0;

			while (partitionStack.length > 0) {
				rightIndex = <number>partitionStack.pop();
				leftIndex = <number>partitionStack.pop();

				//console.log("(" + leftIndex + ", " + rightIndex + "), length: "+ (rightIndex - leftIndex + 1))

				if (rightIndex - leftIndex >= 20) {
					equalToPivotCount = 0;
					largerThanPivotCount = 0;

					pivotValue = elements[JSRandom.getIntegerInRange(leftIndex, rightIndex + 1)];
					smallerThanPivotStorageIndex = leftIndex;

					for (let i = leftIndex; i <= rightIndex; i++) {
						const comparisonResult = comparer(elements[i], pivotValue);
						comparisonCount++;

						if (comparisonResult < 0) {
							if (smallerThanPivotStorageIndex !== i)
								elements[smallerThanPivotStorageIndex] = elements[i];

							smallerThanPivotStorageIndex++
						}
						else if (comparisonResult > 0)
							largerThanPivot[largerThanPivotCount++] = elements[i];
						else
							equalToPivot[equalToPivotCount++] = elements[i];
					}

					writeIndex = smallerThanPivotStorageIndex;

					for (let i = 0; i < equalToPivotCount; i++)
						elements[writeIndex++] = equalToPivot[i];

					for (let i = 0; i < largerThanPivotCount; i++)
						elements[writeIndex++] = largerThanPivot[i];

					if (largerThanPivotCount > 1) {
						partitionStack.push(rightIndex - largerThanPivotCount + 1);
						partitionStack.push(rightIndex);
					}

					if (smallerThanPivotStorageIndex - leftIndex > 1) {
						partitionStack.push(leftIndex);
						partitionStack.push(smallerThanPivotStorageIndex - 1);
					}
				}
				else {
					rangeInsertionSort(leftIndex, rightIndex);
				}

				//
				if (comparisonCount >= 1000 && timer.getElapsedTime() >= timeout) {
					await PromiseX.yield();
					comparisonCount = 0;
					timer.restart();
				}
			}
		}

		isSorted(comparer: Comparer<T>): boolean {
			if (this.length <= 1)
				return true;

			for (let i = 1, length = this.elements.length; i < length; i++)
				if (comparer(this.elements[i], this.elements[i - 1]) < 0)
					return false;

			return true;
		}

		get isEmpty(): boolean {
			return this.length === 0;
		}
	}
}
