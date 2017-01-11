/// <reference path="List.ts"/>
namespace ZincDB {
	export class SortedList<T> extends List<T>
	{
		comparer: Comparer<T>;

		constructor(comparer: Comparer<T>, initialElements?: any[], assumeSorted = false) {
			if (!comparer)
				throw new Error("SortedList: no comparer was given");

			super(initialElements);

			this.comparer = comparer;

			// If there's no need to sort or explicitly requested to skip sorting, sort the elements with the given comparer
			if (this.elements.length > 1 && !assumeSorted)
				this.sort(comparer);
		}

		// Add an element to the list
		add(element: T) {
			if (element == null)
				throw new TypeError("SortedList.add: attempt to add a null or undefined element");

			const newElementIndex = this.binarySearchForFirstElementGreaterThan(element);

			if (newElementIndex === -1)
				this.elements.push(element);
			else
				this.elements.splice(newElementIndex, 0, element);
		}

		/*
		addOrUpdateUniqueValue(value: T)
		{
			if (value == null)
				throw new TypeError("SortedList.add: attempt to add a null or undefined value");

			const newElementIndex = this.binarySearchForFirstElementLargerOrEqualTo(value);

			if (newElementIndex === -1)
				this.elements.push(value);
			else if (this.comparer(this.elements[newElementIndex], value) === 0)
				this.elements[newElementIndex] = value;
			else
				this.elements.splice(newElementIndex, 0, value);
		}
		*/

		// Remove an element from the list, returns false if not found
		removeExactMatch(value: T): boolean {
			const position = this.binarySearchForFirstExactMatch(value);

			if (position === -1)
				return false;

			this.elements.splice(position, 1);

			return true;
		}

		// Update and reposition an element, if needed, requires the current (pre-update) position to be supplied
		updateAndRepositionIfNeeded(newValue: T, currentPosition: number): boolean {
			// Update the value
			this.elements[currentPosition] = newValue;

			// Reposition if needed
			return this.repositionIfNeeded(currentPosition);
		}

		repositionIfNeeded(currentPosition: number, forceReinsertion?: boolean): boolean {
			if (!forceReinsertion && this.isPositionedCorrectly(currentPosition))
				return false;

			// Remove the element
			const removedElement = this.elements.splice(currentPosition, 1)[0];

			// Re-add the element
			this.add(removedElement);

			return true;
		}

		// Check if an element is poitioned correctly in the list
		isPositionedCorrectly(position: number): boolean {
			if (position < 0 || position >= this.elements.length)
				throw new RangeError("Invalid position");

			const element = this.elements[position];

			return (position === 0 || this.comparer(element, this.elements[position - 1]) >= 0) &&
				((position === this.elements.length - 1) || this.comparer(element, this.elements[position + 1]) <= 0);
		}

		// Find the index of the first exact matching value in the list using binary search followed by linear search 
		// (to scan the equal values)
		binarySearchForFirstExactMatch(value: T): number {
			// Start with a binary search
			const startIndex = this.binarySearchForFirstElementGreaterOrEqualTo(value);

			if (startIndex === -1)
				return -1;

			// Continue with linear search, while elements still compare as equal 
			for (let i = startIndex, length = this.elements.length;
				i < length && this.comparer(value, this.elements[i]) === 0;
				i++) {
				if (this.elements[i] === value)
					return i;
			}

			return -1;
		}

		// Get all values within a min and max limits
		binarySearchForRange(minObject: T, maxObject: T): T[] {
			const minIndex = this.binarySearchForFirstElementGreaterOrEqualTo(minObject);
			if (minIndex === -1)
				return [];

			let maxIndex = this.binarySearchForFirstElementGreaterThan(maxObject);
			if (maxIndex === -1)
				maxIndex = this.elements.length;

			return this.elements.slice(minIndex, maxIndex);
		}

		// Binary search for first element equal to a given value
		binarySearchForFirstElementEqualTo(value: T): number {
			const largerOrEqualIndex = this.binarySearchForFirstElementGreaterOrEqualTo(value);

			// If the result isn't -1 and value is equal to the value at the given index, return the index, otherwise, return -1
			if (largerOrEqualIndex > -1 && this.comparer(value, this.elements[largerOrEqualIndex]) === 0)
				return largerOrEqualIndex;
			else
				return -1;
		}

		// Binary search for first element greater or equal to a given value, accepts a custom comparer
		binarySearchForFirstElementGreaterOrEqualTo(value: T, comparer?: Comparer<T>): number {
			if (!comparer)
				comparer = this.comparer;

			let high = this.elements.length - 1;

			if (high === -1 || comparer(value, this.elements[high]) > 0)
				return -1;

			if (comparer(value, this.elements[0]) <= 0)
				return 0;

			let low = 1;
			high--;

			while (low <= high) {
				const middle = ((low + high) / 2) | 0; // x | 0 is equivalent to Math.floor(x)

				if (comparer(value, this.elements[middle]) <= 0)
					high = middle - 1;
				else
					low = middle + 1;
			}

			return high + 1;
		}

		// Binary search for first element larger than a given value, accepts a custom comparer
		binarySearchForFirstElementGreaterThan(value: T, comparer?: Comparer<T>): number {
			if (!comparer)
				comparer = this.comparer;

			let high = this.elements.length - 1;

			if (high === -1 || comparer(value, this.elements[high]) >= 0)
				return -1;

			if (comparer(value, this.elements[0]) < 0)
				return 0;

			let low = 1;
			high--;

			while (low <= high) {
				const middle = ((low + high) / 2) | 0; // x | 0 is equivalent to Math.floor(x)

				if (comparer(value, this.elements[middle]) < 0)
					high = middle - 1;
				else
					low = middle + 1;
			}

			return high + 1;
		}

		// Check if the list is sorted
		isSorted(): boolean {
			return super.isSorted(this.comparer);
		}
	}
}