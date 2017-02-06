namespace ZincDB {
	describe("Data structures:", () => {
		describe("ObjectBasedSet:", () => {
			it("Adds and checks for existence of a key", () => {
				const set = new ObjectBasedSet();
				set.add("Key 1");
				expect(set.size).toEqual(1);
				set.add("Key 2");
				expect(set.size).toEqual(2);
				expect(set.has("Key 1")).toBe(true);
				expect(set.has("Key 2")).toBe(true);
				expect(set.has("Key 3")).toBe(false);
			});

			it("Deletes a key", () => {
				const set = new ObjectBasedSet();
				set.add("Key 1");
				set.add("Key 2");
				expect(set.has("Key 1")).toBe(true);
				expect(set.has("Key 2")).toBe(true);
				set.delete("Key 2");
				expect(set.size).toEqual(1);
				expect(set.has("Key 2")).toBe(false);
			});

			it("Iterates all keys", () => {
				const set = new ObjectBasedSet();
				set.add("Key 1");
				set.add("Key 2");
				set.delete("Key 2");
				set.add("Key 3");

				let i = 0;

				set.forEach((key) => {
					if (i === 0)
						expect(key).toEqual("Key 1");
					else if (i === 1)
						expect(key).toEqual("Key 3");
					else if (i === 2)
						expect(false).toBe(true, "Expected forEach to only call the callback twice");

					i++;
				});
			});

			it("Clears the set", () => {
				const set = new ObjectBasedSet();
				set.add("Key 1");
				set.add("Key 2");
				set.delete("Key 2");
				set.add("Key 3");

				set.clear();
				expect(set.size).toEqual(0);
				expect(set.has("Key 1")).toEqual(false);
				expect(set.has("Key 2")).toEqual(false);
			});
		});
	});
}