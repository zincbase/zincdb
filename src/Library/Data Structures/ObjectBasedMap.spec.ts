namespace ZincDB {
	describe("Data structures:", () => {
		describe("ObjectBasedMap:", () => {
			it("Adds and gets a key", () => {
				const map = new ObjectBasedMap<any>();
				map.set("Key 1", 34);
				expect(map.size).toEqual(1);
				map.set("Key 2", "Hello World!");
				expect(map.size).toEqual(2);
				expect(map.get("Key 1")).toEqual(34);
				expect(map.get("Key 2")).toEqual("Hello World!");
				expect(map.get("Key 3")).toEqual(undefined);
			});

			it("Adds and checks for existence of a key", () => {
				const map = new ObjectBasedMap<any>();
				map.set("Key 1", 34);
				expect(map.size).toEqual(1);
				map.set("Key 2", "Hello World!");
				expect(map.size).toEqual(2);
				expect(map.has("Key 1")).toBe(true);
				expect(map.has("Key 2")).toBe(true);
				expect(map.has("Key 3")).toBe(false);
			});

			it("Deletes a key", () => {
				const map = new ObjectBasedMap<any>();
				map.set("Key 1", 34);
				map.set("Key 2", "Hello World!");

				map.delete("Key 2");
				expect(map.size).toEqual(1);
				expect(map.has("Key 2")).toBe(false);
				expect(map.get("Key 2")).toEqual(undefined);
			});

			it("Iterates all keys", () => {
				const map = new ObjectBasedMap<any>();
				map.set("Key 1", 34);
				map.set("Key 2", "Hello World!");
				map.set("Key 2", ["Hi", 42]);
								
				map.delete("Key 2");

				let i = 0;

				map.forEach((value, key) => {
					if (i === 0) {
						expect(key).toEqual("Key 1");
						expect(value).toEqual(34);
					}
					else if (i === 1) {
						expect(key).toEqual("Key 3");
						expect(value).toEqual(["Hi", 42]);
					}
					else if (i === 2) {
						expect(false).toBe(true, "Expected forEach to only call the callback twice");
					}

					i++;
				});
			});

			it("Clears the map", () => {
				const map = new ObjectBasedMap<any>();
				map.set("Key 1", 34);
				map.set("Key 2", "Hello World!");
				map.set("Key 3", ["Hi", 42]);

				map.clear();
				expect(map.size).toEqual(0);
				expect(map.has("Key 1")).toEqual(false);
				expect(map.has("Key 2")).toEqual(false);
				expect(map.has("Key 3")).toEqual(false);
				expect(map.get("Key 1")).toEqual(undefined);
				expect(map.get("Key 2")).toEqual(undefined);
				expect(map.get("Key 3")).toEqual(undefined);
			});
		});
	});
}