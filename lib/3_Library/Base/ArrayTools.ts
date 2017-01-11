namespace ZincDB {
	export namespace ArrayTools {
		export const copyElements = function(source: IndexedCollection<any>, sourceIndex: number, destination: IndexedCollection<any>, destinationIndex: number, count: number) {
			while (count--)
				destination[destinationIndex++] = source[sourceIndex++];
		}

		export const zeroElements = function(collection: IndexedCollection<any>, index: number = 0, count?: number) {
			if (count === undefined)
				count = collection.length;

			while (count--)
				collection[index++] = 0;
		}

		export const compareArraysAndLog = function(array1: IndexedCollection<any>, array2: IndexedCollection<any>): boolean {
			if (array1 === array2)
				return true;

			if (array1.length !== array2.length) {
				console.log(`compareArrays: array1 has length ${array1.length}, array2 has length ${array2.length}`);
				return false;
			}

			for (let i = 0; i < array1.length; i++) {
				if (array1[i] != array2[i]) {
					console.log(`compareArrays: array1[${i}] == ${array1[i]}, array2[${i}] == ${array2[i]}`);
					return false;
				}
			}

			return true;
		}

		export const arraysAreEqual = function(array1: IndexedCollection<any>, array2: IndexedCollection<any>): boolean {
			if (array1 === array2)
				return true;

			if (array1.length !== array2.length)
				return false;

			for (let i = 0; i < array1.length; i++)
				if (array1[i] !== array2[i])
					return false;

			return true;
		}

		export const indexOf = function(elements: IndexedCollection<any>, value: any, startOffset: number = 0): number {
			for (let i = startOffset, length = elements.length; i < length; i++)
				if (elements[i] === value)
					return i;

			return -1;
		}

		export const lastIndexOf = function(elements: IndexedCollection<any>, value: any, endOffset?: number): number {
			if (endOffset === undefined)
				endOffset = elements.length;

			for (let i = endOffset - 1; i >= 0; i--)
				if (elements[i] === value)
					return i;

			return -1;
		}

		export const reverseInPlace = function(array: IndexedCollection<any>): IndexedCollection<any> {
			let left = 0;
			let right = array.length - 1;
			let temp;

			while (left < right) {
				temp = array[left];
				array[left] = array[right];
				array[right] = temp;

				left += 1;
				right -= 1;
			}

			return array;
		}

		export const countNonzeroValuesInArray = function(array: IndexedCollection<any>): number {
			let result = 0;
			for (let i = 0; i < array.length; i++)
				if (array[i] != null && array[i] != 0)
					result++;

			return result;
		}

		export const truncateStartingElements = function(array: Array<any>, truncatedLength: number) {
			if (array.length <= truncatedLength)
				throw new RangeError(`Requested length should be smaller than array length`);

			const sourcePosition = array.length - truncatedLength;

			for (let i = 0; i < truncatedLength; i++)
				array[i] = array[sourcePosition + i];

			array.length = truncatedLength;
		}

		export const doubleUint8ArrayCapacity = function(array: Uint8Array): Uint8Array {
			const newArray = new Uint8Array(array.length * 2);
			newArray.set(array);

			return newArray;
		}

		export const forEach = function(elements: IndexedCollection<any>, func: Function) {
			if (!elements)
				return;

			for (let i = 0, length = elements.length; i < length; i++)
				func(elements[i], i);
		}

		export const xorNumberArrays = function(target: IndexedCollection<number>, source: IndexedCollection<number>, count: number) {
			for (let i = 0; i < count; i++)
				target[i] ^= source[i];
		}

		export const partitionArrayToEqualParts = function(array: any[], maxPartitionCount: number): any[][] {
			const maxPartitionLength = Math.ceil(array.length / maxPartitionCount);
			return partitionArrayToPartsOfLength(array, maxPartitionLength);
		}

		export const partitionArrayToPartsOfLength = function(array: any[], maxPartitionLength: number): any[][] {
			const partitions: any[][] = [];

			for (let startOffset = 0; startOffset < array.length;) {
				const currentPartitionLength = Math.min(maxPartitionLength, array.length - startOffset);
				partitions.push(array.slice(startOffset, startOffset + currentPartitionLength));

				//console.log(currentPartitionLength);
				startOffset += currentPartitionLength;
			}

			return partitions;
		}

		export const concatUint8Arrays = function(arrays: Uint8Array[]): Uint8Array {
			let totalLength = 0;

			for (const array of arrays)
				totalLength += array.length;

			const result = new Uint8Array(totalLength);
			let offset = 0;

			for (const array of arrays) {
				result.set(array, offset);
				offset += array.length;
			}

			return result;
		}
	}
} 