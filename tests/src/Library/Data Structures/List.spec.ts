namespace ZincDB {
	describe("Data structures:", () => {
		describe("List:", () => {
			let list1: List<number>;

			beforeEach(() => {
				list1 = new List<number>();
			})

			it("Slices", () => {
				list1.addArray([9, 4, -3, -6, 5]);
				expect(list1.slice(1, 4).elements).toEqual([4, -3, -6]);
			});

			it("Removes first and last elements", () => {
				list1.addArray([9, 4, -3, -6, 5]);
				expect(list1.removeFirst()).toEqual(9);
				expect(list1.elements).toEqual([4, -3, -6, 5]);

				expect(list1.removeLast()).toEqual(5);
				expect(list1.elements).toEqual([4, -3, -6]);
			});

			it("Removes an element", () => {
				list1.addArray([9, 4, -3, -6, 5]);
				const result = list1.removeRange(1, 3);
				expect(list1.elements).toEqual([9, 5]);
				expect(result.elements).toEqual([4, -3, -6]);
			});

			it("Takes while a condition is true", () => {
				list1.addArray([5, 4, -3, -6, 5]);
				const result = list1.getWhile((n) => n >= 0);
				expect(list1.elements).toEqual([5, 4, -3, -6, 5]);
				expect(result.elements).toEqual([5, 4]);
			});


			it("Adds an element to the start", () => {
				list1.addArray([9, 4, -3, -6, 5]);
				list1.addFirst(-7);
				expect(list1.elements).toEqual([-7, 9, 4, -3, -6, 5]);

				list1.add(31);
				expect(list1.elements).toEqual([-7, 9, 4, -3, -6, 5, 31]);
			});

			it("Checks for a predicate satisfied by all elements", () => {
				list1.addArray([4, 6, -2, 16, 18]);
				let result = list1.allSatisfy((number) => number % 2 == 0);
				expect(result).toEqual(true);

				list1.clear();
				list1.addArray([4, 5, -2, 16, 18]);
				result = list1.allSatisfy((number) => number % 2 == 0);
				expect(result).toEqual(false);
			});

			it("Reduces all elements to a value", () => {
				list1.addArray([4, 6, 2]);
				const result = list1.reduce<number>((item, sum) => item + sum, 0);

				expect(result).toEqual(12);
			});

			it("Reverses order of elements", () => {
				list1.addArray([9, 4, -3, -6, 5]);
				list1.reverse();
				expect(list1).toEqual(new List<number>([5, -6, -3, 4, 9]));

				expect(list1.getReversed()).toEqual(new List<number>([9, 4, -3, -6, 5]));
			});

			it("Maps elements", () => {
				list1.addArray([9, 4, -3, -6, 5]);
				const result = list1.map<string>((item) => (item * 3).toString());

				expect(result).toEqual(new List<string>(["27", "12", "-9", "-18", "15"]));
			});

			it("Finds first match in elements", () => {
				list1.addArray([9, 4, -3, -6, 5]);
				let index = list1.findFirstMatchIndex((item) => item * 2 == -12);
				const result = list1.findFirstMatch((item) => item * 2 == -12);

				expect(index).toEqual(3);
				expect(result).toEqual(-6);
				expect(list1.indexOf(-3)).toEqual(2);
			});

			it("Filters elements", () => {
				list1.addArray([9, 4, -3, -6, 5]);
				expect(list1.filter((n) => n % 3 == 0).elements).toEqual([9, -3, -6]);
			});

			it("Performs foreach", () => {
				list1.addArray([9, 4, -3, -6, 5]);

				let sum = 0;
				list1.forEach((n) => sum += n);

				expect(sum).toEqual(9);
			});

			it("Performs foreach asynchronously", async () => {
				list1.addArray([9, 4, -3, -6, 5]);
				const list2 = new List<number>();

				await list1.forEachAsync((n) => list2.add(n * 2));
				expect(list2.elements).toEqual([18, 8, -6, -12, 10]);
			});

			it("Sorts asynchronously", async () => {
				const numberComparer = (number1: number, number2: number) => number1 - number2;

				list1.addRepeatedly(() => Math.random(), 100);
				const list1Copy = list1.clone();
				list1Copy.elements.sort(numberComparer);

				await list1.sortAsync(numberComparer);
				expect(list1).toEqual(list1Copy);
				expect(list1.isSorted(numberComparer)).toBe(true);
			});

			it("Sort is stable", async () => {
				const objectComparer = (o1: any, o2: any) => o1["age"] - o2["age"];
				const objects =
					[
						{ name: "Tom", age: 20 },
						{ name: "Angela", age: 20 },
						{ name: "Ron", age: 19 },
						{ name: "Dave", age: 19 },
						{ name: "Ann", age: 23 },
						{ name: "John", age: 23 },
						{ name: "Bob", age: 19 },
						{ name: "Tim", age: 20 },
						{ name: "Dan", age: 18 },
						{ name: "Josh", age: 23 },
						{ name: "Jane", age: 18 },
					];

				const objectList = new List<any>(objects);
				const sortedObjectList = objectList.clone();

				await sortedObjectList.sortAsync(objectComparer, 1000000);
				expect(sortedObjectList.elements).toEqual(
					[
						{ name: "Dan", age: 18 },
						{ name: "Jane", age: 18 },
						{ name: "Ron", age: 19 },
						{ name: "Dave", age: 19 },
						{ name: "Bob", age: 19 },
						{ name: "Tom", age: 20 },
						{ name: "Angela", age: 20 },
						{ name: "Tim", age: 20 },
						{ name: "Ann", age: 23 },
						{ name: "John", age: 23 },
						{ name: "Josh", age: 23 },
					]);
			});

			it("Filters asynchronously", async () => {
				list1.addArray([9, 4, -3, -6, 5]);

				const results = await list1.filterAsync((n) => n < 0)
				expect(results.elements).toEqual([-3, -6]);
			});

			it("Maps asynchronously", async () => {
				list1.addArray([9, 4, -3, -6, 5]);

				const results = await list1.mapAsync((n) => n * 2);
				expect(results.elements).toEqual([18, 8, -6, -12, 10]);
			});

			it("Reduces asynchronously", async () => {
				list1.addArray([4, 6, 2]);

				const result = await list1.reduceAsync<number>((item, sum) => item + sum, 0);
				expect(result).toEqual(12);
			});
		});
	});
}