namespace ZincDB {
	describe("ValueSet:", () => {
		let testSet1: ValueSet<number>;
		let testSet2: ValueSet<number>;

		beforeEach(() => {
			testSet1 = new ValueSet<number>();
			testSet2 = new ValueSet<number>();
		});

		it("Creates a set by adding elements", () => {
			testSet1.add(3);
			testSet1.add(7);
			testSet1.add(3);
			testSet1.add(23);
			testSet1.add(7);
			testSet1.add(7);

			expect(testSet1.elements).toEqual([3, 7, 23]);
		});

		it("Creates a sets by adding an array", () => {
			testSet1.addArray([43, 5, 5, 43, 4, 4, 4, 6, 5]);

			expect(testSet1.elements).toEqual([43, 5, 4, 6]);
		});

		it("Creates a set by initializing with an array", () => {
			testSet1 = new ValueSet<number>([43, 5, 5, 43, 4, 4, 4, 6, 5]);

			expect(testSet1.elements).toEqual([43, 5, 4, 6]);
		});

		it("Gives correct length", () => {
			testSet1.addArray([3, 4, 6, 6, 8, 10]);
			expect(testSet1.length).toEqual(5);
		});

		it("Checks containment", () => {
			testSet1.addArray([3, 4, 6, 6, 8, 10]);
			expect(testSet1.contains(4)).toBe(true);
			expect(testSet1.contains(5)).toBe(false);
		});

		it("Removes a value from a set", () => {
			testSet1.addArray([3, 4, 6, 6, 8, 10]);
			testSet1.remove(6);
			expect(testSet1.elements).toEqual([3, 4, 8, 10]);
		});

		it("Unites sets", () => {
			testSet1.addArray([-3, 4, 6, 8, 10]);
			testSet2.addArray([-3, 3, 5, 7, 8, 11]);
			expect(testSet1.uniteWith(testSet2).elements).toEqual([-3, 4, 6, 8, 10, 3, 5, 7, 11]);
		});

		it("Intersects sets", () => {
			testSet1.addArray([-3, 4, 6, 8, 10]);
			testSet2.addArray([-3, 3, 5, 7, 8, 11]);
			expect(testSet1.intersectWith(testSet2).elements).toEqual([-3, 8]);
		});

		it("Subtracts sets", () => {
			testSet1.addArray([3, 4, 6, 8, 10]);
			testSet2.addArray([3, 5, 7, 8, 11]);

			expect(testSet1.subtract(testSet2).elements).toEqual([4, 6, 10]);
			expect(testSet2.subtract(testSet1).elements).toEqual([5, 7, 11]);
		});
	});
} 