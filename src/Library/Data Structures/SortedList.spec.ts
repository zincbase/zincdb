namespace ZincDB {
	describe("Data structures:", () => {
		describe("SortedList:", () => {
			let objectSortedList: SortedList<any>;
			const propertyObjects = [{ "firstName": "John", "lastName": "Doe", "age": 39 }, { "firstName": "Johnny", "lastName": "Zepp", "age": 21 }, { "firstName": "Adam", "lastName": "Ant", "age": 23 }, { "firstName": "Max", "lastName": "Payne", "age": 15 }];
			const lastNamePropertyComparer: Comparer<any> = (element1, element2) => Comparers.simpleStringComparer(element1["lastName"], element2["lastName"]);

			const expectObjectListIsSorted = () => expect(objectSortedList.isSorted()).toEqual(true);

			let numberedObjectsSortedList: SortedList<any>;
			const numberedObjectsComparer: Comparer<any> = (e1, e2) => e1.value - e2.value;
			const rand = new SeededRandom();

			beforeEach(() => {
				objectSortedList = new SortedList<any>(lastNamePropertyComparer, propertyObjects);
				numberedObjectsSortedList = new SortedList<any>(numberedObjectsComparer);

				for (let i = 0; i < 100; i++)
					numberedObjectsSortedList.add({ value: rand.getIntegerInRange(-5, 50) });
			});

			it("Copies the content of the given array or object", () => {
				expect(objectSortedList.elements.length).toEqual(propertyObjects.length);

				for (let i = 0; i < propertyObjects.length; i++)
					expect(objectSortedList.indexOf(propertyObjects[i])).not.toBe(-1);
			});

			it("Sorts the content of the given array or object", () => {
				expectObjectListIsSorted();
			});

			describe("Add:", () => {
				let addedElement: any;

				beforeEach(() => {
					addedElement = { "firstName": "Johny", "lastName": rand.getWordCharacterString(5), "age": 22 }
					objectSortedList.add(addedElement);
				});

				it("Adds the element", () => {
					objectSortedList.indexOf(addedElement);
					expect(objectSortedList.indexOf(addedElement)).not.toEqual(-1);
				});

				it("Maintains correct order", () => {
					expectObjectListIsSorted();
				});
			});

			describe("Remove:", () => {
				let removedElement: any;
				let previousLength: any;

				beforeEach(() => {
					previousLength = objectSortedList.elements.length;
					removedElement = objectSortedList.elements[rand.getIntegerInRange(0, objectSortedList.elements.length)];
					objectSortedList.removeExactMatch(removedElement);
				});

				it("Removes the element", () => {
					expect(objectSortedList.indexOf(removedElement)).toBe(-1);

				});

				it("Maintains correct order", () => {
					expectObjectListIsSorted();
				});

				it("Removes exactly one element", () => {
					expect(objectSortedList.elements.length).toEqual(previousLength - 1);
				});
			});

			describe("RepositionIfNeeded:", () => {
				beforeEach(() => {

				});

				it("Repositions an element if it breaks the sort order", () => {
					for (let i = 0; i < 1000; i++) {
						const repositionedElementOldPosition = rand.getIntegerInRange(0, objectSortedList.elements.length);
						const repositionedElement = objectSortedList.elements[repositionedElementOldPosition];
						repositionedElement["lastName"] = rand.getWordCharacterString(5);

						if (!objectSortedList.isPositionedCorrectly(repositionedElementOldPosition)) {
							const previousLength = objectSortedList.elements.length;

							// pre-conditions
							expect(objectSortedList.isSorted()).toBe(false);

							// test
							objectSortedList.updateAndRepositionIfNeeded(repositionedElement, repositionedElementOldPosition);

							// post-conditions
							expect(objectSortedList.indexOf(repositionedElement)).not.toBe(-1);
							expect(objectSortedList.isSorted()).toBe(true);
							expect(objectSortedList.elements.length).toEqual(previousLength);
						}
						else {
							expect(objectSortedList.isSorted()).toBe(true);
						}
					}
				});
			});

			describe("BinarySearchForFirstElementEqualTo", () => {
				const linearSearchForFirstElementEqualTo = (value: any): number => {
					for (let i = 0; i < numberedObjectsSortedList.length; i++)
						if (numberedObjectsComparer(numberedObjectsSortedList.elements[i], value) === 0)
							return i;

					return -1;
				};

				it("Finds the position of the first element larger or equal to the the given one", () => {
					for (let i = -10; i < numberedObjectsSortedList.length + 10; i++) {
						const value = { value: i };
						expect(numberedObjectsSortedList.binarySearchForFirstElementEqualTo(value)).toEqual(linearSearchForFirstElementEqualTo(value));
					}
				});
			});

			describe("BinarySearchForFirstElementLargerOrEqualTo", () => {
				const linearSearchForFirstElementLargerOrEqualTo = (value: any): number => {
					for (let i = 0; i < numberedObjectsSortedList.length; i++)
						if (numberedObjectsComparer(numberedObjectsSortedList.elements[i], value) >= 0)
							return i;

					return -1;
				};

				it("Finds the position of the first element larger or equal to the the given one", () => {
					for (let i = -10; i < numberedObjectsSortedList.length + 10; i++) {
						const value = { value: i };
						expect(numberedObjectsSortedList.binarySearchForFirstElementGreaterOrEqualTo(value)).toEqual(linearSearchForFirstElementLargerOrEqualTo(value));
					}
				});
			});

			describe("BinarySearchForFirstElementGreaterThan", () => {
				const linearSearchForFirstElementGreaterThan = (value: any): number => {
					for (let i = 0; i < numberedObjectsSortedList.length; i++)
						if (numberedObjectsComparer(numberedObjectsSortedList.elements[i], value) > 0)
							return i;

					return -1;
				};

				it("Finds the position of the first element greater than the given one", () => {
					for (let i = -10; i < numberedObjectsSortedList.length + 10; i++) {
						const value = { value: i };
						expect(numberedObjectsSortedList.binarySearchForFirstElementGreaterThan(value)).toEqual(linearSearchForFirstElementGreaterThan(value));
					}
				});
			});

			describe("binarySearchForExactMatch", () => {
				it("Returns the position of the first occurance of the given value in the array", () => {
					for (let i = 0; i < numberedObjectsSortedList.length; i++)
						expect(numberedObjectsSortedList.binarySearchForFirstExactMatch(numberedObjectsSortedList.elements[i])).toEqual(numberedObjectsSortedList.indexOf(numberedObjectsSortedList.elements[i]));
				});
			});

			describe("binarySearchForRange", () => {
				const linearSearchForRange = (min: number, max: number): number[] => {
					const results = []

					for (let i = 0; i < numberedObjectsSortedList.elements.length; i++)
						if (numberedObjectsComparer(numberedObjectsSortedList.elements[i], min) >= 0 && numberedObjectsComparer(numberedObjectsSortedList.elements[i], max) <= 0)
							results.push(numberedObjectsSortedList.elements[i]);

					return results;
				};

				it("Returns all elements in range", () => {
					const rand = new SeededRandom();

					for (let i = 0; i < 50; i++) {
						const randomMin = rand.getIntegerInRange(-4, 25);
						const randomMax = rand.getIntegerInRange(-4, 25);
						expect(numberedObjectsSortedList.binarySearchForRange(randomMin, randomMax)).toEqual(linearSearchForRange(randomMin, randomMax));
					}
				});
			});
		});
	});
}
