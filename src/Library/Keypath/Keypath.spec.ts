namespace ZincDB {
	export namespace Keypath {
		describe("Keypath:", () => {
			describe("Parse and stringify keypath", () => {
				it("Parses a set of string keypaths", () => {
					expect(Keypath.parse("['hello']['world']")).toEqual(["hello", "world"]);
					expect(Keypath.parse("[' hello']['world ']")).toEqual([" hello", "world "]);
					expect(Keypath.parse("['Hello'][2]['People']")).toEqual(["Hello", 2, "People"]);
					expect(Keypath.parse("['Hello']['That [one]']['People']")).toEqual(["Hello", "That [one]", "People"]);
					expect(Keypath.parse("['Hello']['friend ''John''!']")).toEqual(["Hello", "friend 'John'!"]);
					expect(Keypath.parse("['Hello']['friend ''John''!'][5343]")).toEqual(["Hello", "friend 'John'!", 5343]);
					expect(Keypath.parse("[654645]['friend ''John''!'][5343]")).toEqual([654645, "friend 'John'!", 5343]);
					expect(Keypath.parse("['Hello']['friend ''John''''''!'][5343]")).toEqual(["Hello", "friend 'John'''!", 5343]);
				});

				it("Errors when parsing invalid keypaths", () => {
					expect(() => Keypath.parse("abcd")).toThrow();
					expect(() => Keypath.parse("['hello''aaa")).toThrow();
					expect(() => Keypath.parse("['abcd']65")).toThrow();
					expect(() => Keypath.parse("['abcd']]")).toThrow();
					expect(() => Keypath.parse("[['abcd']")).toThrow();
					expect(() => Keypath.parse("['abcd'][34534")).toThrow();
					expect(() => Keypath.parse("['abcd'][]['efg']")).toThrow();
					expect(() => Keypath.parse("['abcd'hello']['efg']")).toThrow();
					expect(() => Keypath.parse("['hello'abcd]['efg']")).toThrow();
					expect(() => Keypath.parse("['hello'][234234']")).toThrow();
				});

				it("Stringifies a set of array keypaths", () => {
					expect(Keypath.stringify(["hello", "world"])).toEqual("['hello']['world']");
					expect(Keypath.stringify([" hello", "world "])).toEqual("[' hello']['world ']");
					expect(Keypath.stringify(["Hello", 2, "People"])).toEqual("['Hello'][2]['People']");
					expect(Keypath.stringify(["Hello", "That [one]", "People"])).toEqual("['Hello']['That [one]']['People']");
					expect(Keypath.stringify(["Hello", "friend 'John'!", 5343])).toEqual("['Hello']['friend ''John''!'][5343]");
					expect(Keypath.stringify(["Hello", "friend 'John'''!", 5343])).toEqual("['Hello']['friend ''John''''''!'][5343]");
				});

				it("Stringifies a series of random array keypaths", () => {
					const rand = new SeededRandom();

					for (let i = 0; i < 1000; i++) {
						const len = rand.getIntegerUpTo(10);
						let randomPath: Keypath = [];

						for (let j = 0; j < len; j++) {
							if (rand.getBool()) {
								randomPath.push(rand.getIntegerUpTo(2 ** 32));
							} else {
								randomPath.push(rand.getUTF16String(rand.getIntegerUpTo(40)));
							}
						}

						expect(Keypath.parse(Keypath.stringify(randomPath))).toEqual(randomPath);
					}
				});
			});

			describe("Flatten object tree", () => {
				it("Flattens a simple object tree", () => {
					const obj = {
						abcd: 534,
						efg: "Hi There!",
						hi: true
					}

					const expectedResult = [
						{ path: ["abcd"], value: 534 },
						{ path: ["efg"], value: "Hi There!" },
						{ path: ["hi"], value: true }
					]

					expect(Keypath.flattenObjectTree(obj)).toEqual(expectedResult);
				});

				it("Flattens a simple object tree containing an array", () => {
					const obj = {
						abcd: 534,
						efg: "Hi There!",
						hi: true,
						arr: [345, "YES Dear?"]
					}

					const expectedResult = [
						{ path: ["abcd"], value: 534 },
						{ path: ["efg"], value: "Hi There!" },
						{ path: ["hi"], value: true },
						{ path: ["arr", 0], value: 345 },
						{ path: ["arr", 1], value: "YES Dear?" },
					]

					expect(Keypath.flattenObjectTree(obj)).toEqual(expectedResult);
				});

				it("Flattens a simple object tree containing key that needs escaping of one the keys", () => {
					const obj = {
						abcd: 534,
						"abab cacac": "Hi There!",
					}

					const expectedResult = [
						{ path: ["abcd"], value: 534 },
						{ path: ["abab cacac"], value: "Hi There!" },
					]

					expect(Keypath.flattenObjectTree(obj)).toEqual(expectedResult);
				});

				it("Flattens a nested object tree", () => {
					const obj = {
						abcd: 534,
						"abab cacac": {
							t: "Hi There!",
							"2haaaa": [6, "aaa", { x: true }]
						}
					}

					const expectedResult: KeypathAndValue[] = [
						{ path: ["abcd"], value: 534 },
						{ path: ["abab cacac", "t"], value: "Hi There!" },
						{ path: ["abab cacac", "2haaaa", 0], value: 6 },
						{ path: ["abab cacac", "2haaaa", 1], value: "aaa" },
						{ path: ["abab cacac", "2haaaa", 2, "x"], value: true }
					]

					expect(Keypath.flattenObjectTree(obj)).toEqual(expectedResult);
				});

				it("Flattens a nested object tree with empty objects and arrays", () => {
					const obj: any = {
						a: 1234,
						b: {
						},
						c: {
							d: [
							],
							e: [
								{},
								[]
							]

						},
						f: [
						]
					}

					const expectedResult: KeypathAndValue[] = [
						{ path: ["a"], value: 1234 },
						{ path: ["b"], value: {} },
						{ path: ["c", 'd'], value: [] },
						{ path: ["c", "e", 0], value: {} },
						{ path: ["c", "e", 1], value: [] },
						{ path: ["f"], value: [] }
					]

					expect(Keypath.flattenObjectTree(obj)).toEqual(expectedResult);
				});

				it("Flattens and unflattens a complex object tree", () => {
					const obj: any = {
						abcd: 534,
						"23 'efg' aa": {
							t: "Hi There!",
							"2haaaa": [6, "aaa", { x: true }]
						},
						"zz 'zz' zz": [
							{},
							{ b: [] },
							{
								" aaaa ''' bbb ": {
								},
								d: {
									g: null,
									v: {}
								}
							}
						]
					}
					//log(JSON.stringify(Keypath.flattenObjectTree(obj), undefined, 4));
					expect(Keypath.unflattenObjectTree(Keypath.flattenObjectTree(obj))).toEqual(obj);
				});
			});

			function testObjectPatch(patch: typeof Keypath.patchObject) {
				it("Patches an object to add a simple property", () => {
					const obj = {
						abcd: 534,
					}

					const expectedObj = {
						abcd: 534,
						aaa: "hello"
					}

					expect(patch(obj, ["aaa"], "hello")).toEqual(expectedObj);
				});

				it("Patches an object to add a deep property", () => {
					const obj = {
						abcd: 534,
					}

					const expectedObj = {
						abcd: 534,
						aaa: {
							bbb: "hello"
						}
					}

					expect(patch(obj, ["aaa", "bbb"], "hello")).toEqual(expectedObj);
				});

				it("Patches an object to modify a deep property", () => {
					const obj = {
						abcd: 534,
						aaa: {
							bbb: "hello"
						}
					}

					const expectedObj = {
						abcd: 534,
						aaa: {
							bbb: "hello world!"
						}
					}

					expect(patch(obj, ["aaa", "bbb"], "hello world!")).toEqual(expectedObj);
				});

				it("Patches an object to replace a deep property with an array", () => {
					const obj = {
						abcd: 534,
						aaa: {
							bbb: "hello"
						}
					}

					const expectedObj = {
						abcd: 534,
						aaa: {
							bbb: [
								1234
							]
						}
					}

					expect(patch(obj, ["aaa", "bbb", 0], 1234)).toEqual(expectedObj);
				});

				it("Patches an object to replace an existing nested property with an array", () => {
					const obj = {
						abcd: 534,
						aaa: {
							bbb: "hello"
						}
					}

					const expectedObj = {
						abcd: 534,
						aaa: [{ zzz: 123 }]
					}

					expect(patch(obj, ["aaa", 0, "zzz"], 123)).toEqual(expectedObj);
				});

				it("Patches an object to replace an existing nested property with a complex nested tree", () => {
					const obj = {
						abcd: 534,
						aaa: {
							bbb: "hello"
						}
					}

					const expectedObj = {
						abcd: 534,
						aaa: [{ zzz: [{ "a b c": "YYYY" }] }]
					}

					expect(patch(obj, ["aaa", 0, "zzz", 0, "a b c"], "YYYY")).toEqual(expectedObj);
				});

				it("Patches an object where the root is an array", () => {
					const obj = [
						{
							bbb: "hello"
						},
						{
							ccc: "OK"
						}
					]

					const expectedObj = [
						{
							bbb: "hello"
						},
						{
							ccc: [
								{ YO: "HI" }
							]
						}
					]

					expect(patch(obj, [1, "ccc", 0, "YO"], "HI")).toEqual(expectedObj);
				});

				it("Doesn't create intermediate object trees if the eventual value is undefined", () => {
					const obj = {
						abcd: 534,
						aaa: {
							bbb: "hello"
						}
					}

					expect(patch(obj, ["aaa", "ccc"], undefined)).toEqual(obj);
					expect(patch(obj, [12, "ccc"], undefined)).toEqual(obj);
				});
			}

			describe("Patch mutable object", () => {
				testObjectPatch((obj, keypath, value) => Keypath.patchObject(obj, keypath, value));
			});

			describe("Patch immutable object", () => {
				testObjectPatch((obj, keypath, value) => Keypath.patchImmutableObject(obj, keypath, value));
			});

			describe("Diff objects:", () => {
				it("Diffs two objects", () => {
					const obj1 = {
						a: {
							x: "da"
						},
						b: {
							y: "dada"
						},
						c: [
							"zzz"
						]

					}

					const obj2: any = {
						a: {
							x: "da",
							x2: "rr"
						},
						b: {
							z: "aaa"
						},
						c: [
						]
					}

					const expectedDiff: DB.EntryArray<any> = [
						{ key: "['b']['y']", value: undefined, metadata: {} },
						{ key: "['c'][0]", value: undefined, metadata: {} },
						{ key: "['a']['x2']", value: "rr", metadata: {} },
						{ key: "['b']['z']", value: "aaa", metadata: {} },
						{ key: "['c']", value: [], metadata: {} },
					]

					expect(Keypath.diffObjects(obj1, obj2)).toEqual(expectedDiff);
				});

				it("Diffs two complex arrays with nested objects and arrays", () => {
					const obj1 = [
						{
							x: "da",
							x2: {
								o: "rrr"
							}
						},
						{
							y: "dada",
							y2: [
								123
							]
						},
						{
							z: [
								"HELLO",
								{ u: "WORLD" }
							]
						}
					]

					const obj2: any = [
						{
							x: "da!",
							x2: [
							]
						},
						{
							y: "dada",
							y2: [
								"AI",
								444
							]
						},
						{
							z: [
								"HELLO",
								{ t: "WORLD" }
							]
						}
					]

					const expectedDiff: DB.EntryArray<any> = [
						{ key: "[0]['x2']['o']", value: undefined, metadata: {} },
						{ key: "[2]['z'][1]['u']", value: undefined, metadata: {} },
						{ key: "[0]['x']", value: "da!", metadata: {} },
						{ key: "[0]['x2']", value: [], metadata: {} },
						{ key: "[1]['y2'][0]", value: "AI", metadata: {} },
						{ key: "[1]['y2'][1]", value: 444, metadata: {} },
						{ key: "[2]['z'][1]['t']", value: "WORLD", metadata: {} },
					]

					expect(Keypath.diffObjects(obj1, obj2)).toEqual(expectedDiff);
				});
			});

			describe("Utility methods:", () => {
				it("Gets property from an object tree", () => {
					const obj = [
						{
							x: "da",
							x2: {
								o: "rrr"
							},
							"1": 3333
						},
						{
							y: "dada",
							y2: [
								123
							]
						},
						{
							z: [
								"HELLO",
								{ u: "WORLD" }
							]
						}
					]

					expect(Keypath.getValueByKeypath(obj, [0, "1"])).toEqual(3333);
					expect(Keypath.getValueByKeypath(obj, [0, 1])).toEqual(undefined);
					expect(Keypath.getValueByKeypath(obj, [1, "y2", 0])).toEqual(123);

					expect(Keypath.getValueByKeypath(obj, [2, "z", 0])).toEqual("HELLO");
					expect(Keypath.getValueByKeypath(obj, [2, "z", 1, "u"])).toEqual("WORLD");

					expect(Keypath.getValueByKeypath(obj, [2, "z", 2])).toEqual(undefined);

					expect(Keypath.getValueByKeypath(obj, [0])).toEqual({ x: "da", x2: { o: "rrr" }, "1": 3333 });
					expect(Keypath.getValueByKeypath(obj, [])).toEqual(obj);
					expect(Keypath.getValueByKeypath(obj, ["hi"])).toEqual(undefined);
				});

				it("Compares keypaths", () => {
					expect(Keypath.compare(["a", "b"], ["a", "b"])).toEqual(0);
					expect(Keypath.compare(["a", "b"], ["a", "b", "c"])).toEqual(-1);
					expect(Keypath.compare(["a", "b", "c"], ["a", "b"])).toEqual(1);

					expect(Keypath.compare(["b", "b"], ["a", "b"])).toEqual(1);
					expect(Keypath.compare(["a", "b"], ["b", "b"])).toEqual(-1);

					expect(Keypath.compare(["a", "b"], ["a", 0])).toEqual(-1);
					expect(Keypath.compare(["a", 0], ["a", "b"])).toEqual(1);

					expect(Keypath.compare(["a", "0"], ["a", 0])).toEqual(-1);
					expect(Keypath.compare(["a", 1], ["a", "1"])).toEqual(1);
				});

				it("Determines relationship between keypaths", () => {
					expect(Keypath.determineRelationship([], [])).toEqual(Keypath.Relationship.Equal);
					expect(Keypath.determineRelationship(["a", "b", "c"], ["a", "b", "c"])).toEqual(Keypath.Relationship.Equal);

					expect(Keypath.determineRelationship(["a", "b", "d"], ["a", "b", "c"])).toEqual(Keypath.Relationship.None);
					expect(Keypath.determineRelationship(["z", "b", "c"], ["a", "b", "c"])).toEqual(Keypath.Relationship.None);
					expect(Keypath.determineRelationship(["0", "b", "c"], [0, "b", "c"])).toEqual(Keypath.Relationship.None);

					expect(Keypath.determineRelationship(["a", "b"], ["a", "b", "c"])).toEqual(Keypath.Relationship.Ancestor);
					expect(Keypath.determineRelationship(["a", "b", "c"], ["a", "b"])).toEqual(Keypath.Relationship.Descendant);
				});

				it("Determines relationship between string keypaths", () => {
					expect(Keypath.determineStringRelationship("", "")).toEqual(Keypath.Relationship.Equal);
					expect(Keypath.determineStringRelationship("['a']['b']['c']", "['a']['b']['c']")).toEqual(Keypath.Relationship.Equal);

					expect(Keypath.determineStringRelationship("['a']['b']['d']", "['a']['b']['c']")).toEqual(Keypath.Relationship.None);
					expect(Keypath.determineStringRelationship("['z']['b']['d']", "['a']['b']['c']")).toEqual(Keypath.Relationship.None);
					expect(Keypath.determineStringRelationship("['0']['b']['d']", "[0]['b']['c']")).toEqual(Keypath.Relationship.None);

					expect(Keypath.determineStringRelationship("['a']['b']", "['a']['b']['c']")).toEqual(Keypath.Relationship.Ancestor);
					expect(Keypath.determineStringRelationship("['a']['b']['c']", "['a']['b']")).toEqual(Keypath.Relationship.Descendant);
				});
			});
		});
	}
}
