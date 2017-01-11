/*
namespace ExtendTests {
	class Base {
		static counter = 1;

		static get counterAccessor() {
			return this.counter;
		}

		static set counterAccessor(val: number) {
			this.counter = val;
		}

		static incrementCounter() {
			this.counter++;
		}
	}

	class Derived extends Base {
	}

	describe("__extend", () => {
		it("Inherits a static getter and setter correctly", () => {
			expect(Derived.counterAccessor).toEqual(1);
			Derived.incrementCounter();
			expect(Derived.counterAccessor).toEqual(2);

			Derived.counterAccessor = 10;
			expect(Derived.counter).toEqual(10);
		});
	});
}
*/