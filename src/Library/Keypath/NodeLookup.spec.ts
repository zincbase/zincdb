namespace ZincDB {
	export namespace Keypath {
		describe("NodeLookup", () => {
			let nodeLookup: NodeLookup;

			beforeEach(() => {
				nodeLookup = new NodeLookup();
			});

			it("Adds several paths and matches them correctly", () => {
				const path1 = ["Hello", "World!"];
				const path2 = ["Hello", "John!"];
				const path3 = ["How", "are", "you?"];

				nodeLookup.addPaths([path1, path2, path3]);

				let matches = nodeLookup.findMatchingLeafNodes(["Hello", "World!"]);
				expect(matches.matchType).toEqual(MatchType.Exact);
				expect(matches.paths).toEqual([path1]);

				matches = nodeLookup.findMatchingLeafNodes(["Hello", "World!", "great", "day!"]);
				expect(matches.matchType).toEqual(MatchType.Ancestor);
				expect(matches.paths).toEqual([path1]);

				matches = nodeLookup.findMatchingLeafNodes(["Hello"]);
				expect(matches.matchType).toEqual(MatchType.Descendants);
				expect(matches.paths).toEqual([path1, path2]);

				matches = nodeLookup.findMatchingLeafNodes(["How", "are", "you?"]);
				expect(matches.matchType).toEqual(MatchType.Exact);
				expect(matches.paths).toEqual([path3]);

				matches = nodeLookup.findMatchingLeafNodes(["How", "are", "you?", 4, "hey", 3]);
				expect(matches.matchType).toEqual(MatchType.Ancestor);
				expect(matches.paths).toEqual([path3]);

				matches = nodeLookup.findMatchingLeafNodes([]);
				expect(matches.matchType).toEqual(MatchType.Descendants);
				expect(matches.paths).toEqual([path1, path2, path3]);
			});

			it("Reports non-matches correctly", () => {
				const path1 = ["Hello", "World!"];
				const path2 = ["Hello", "John!"];
				const path3 = ["How", "are", "you?"];

				nodeLookup.addPaths([path1, path2, path3]);

				let matches = nodeLookup.findMatchingLeafNodes(["Hello", "World!!"]);
				expect(matches.matchType).toEqual(MatchType.None);
				expect(matches.paths).toEqual([]);

				matches = nodeLookup.findMatchingLeafNodes(["Helloz"]);
				expect(matches.matchType).toEqual(MatchType.None);
				expect(matches.paths).toEqual([]);
			});

			it("Deletes nodes", () => {
				const path1 = ["Hello", "World!"];
				const path2 = ["Hello", "John!"];
				const path3 = ["How", "are", "you?"];
				nodeLookup.addPaths([path1, path2, path3]);

				nodeLookup.delete(path2);
				let matches = nodeLookup.findMatchingLeafNodes(["Hello", "John!"]);
				expect(matches.matchType).toEqual(MatchType.None);
				expect(matches.paths).toEqual([]);

				matches = nodeLookup.findMatchingLeafNodes(["Hello", "World!"]);
				expect(matches.matchType).toEqual(MatchType.Exact);
				expect(matches.paths).toEqual([path1]);

				matches = nodeLookup.findMatchingLeafNodes([]);
				expect(matches.matchType).toEqual(MatchType.Descendants);
				expect(matches.paths).toEqual([path1, path3]);

				matches = nodeLookup.findMatchingLeafNodes(["Hello"]);
				expect(matches.matchType).toEqual(MatchType.Descendants);
				expect(matches.paths).toEqual([path1]);

				nodeLookup.delete(path1);

				matches = nodeLookup.findMatchingLeafNodes(["Hello", "World!"]);
				expect(matches.matchType).toEqual(MatchType.None);
				expect(matches.paths).toEqual([]);

				matches = nodeLookup.findMatchingLeafNodes(["Hello"]);
				expect(matches.matchType).toEqual(MatchType.None);
				expect(matches.paths).toEqual([]);
			});

			it("Allows deleted nodes to be recreated", () => {
				const path1 = ["Hello", "World!"];
				const path2 = ["Hello", "John!"];
				const path3 = ["How", "are", "you?"];
				nodeLookup.addPaths([path1, path2, path3]);

				nodeLookup.delete(path2);

				let matches = nodeLookup.findMatchingLeafNodes(["Hello", "John!"]);
				expect(matches.matchType).toEqual(MatchType.None);
				expect(matches.paths).toEqual([]);

				nodeLookup.add(["Hello", "John!"]);

				matches = nodeLookup.findMatchingLeafNodes(["Hello", "John!"]);
				expect(matches.matchType).toEqual(MatchType.Exact);
				expect(matches.paths).toEqual([path2]);

				matches = nodeLookup.findMatchingLeafNodes(["Hello"]);
				expect(matches.matchType).toEqual(MatchType.Descendants);
				expect(matches.paths).toEqual([path1, path2]);

				matches = nodeLookup.findMatchingLeafNodes([]);
				expect(matches.matchType).toEqual(MatchType.Descendants);
				expect(matches.paths).toEqual([path1, path2, path3]);
			});

			it("Doesn't throw if attempting to delete a non-existing node", () => {
				const path1 = ["Hello", "World!"];
				const path2 = ["Hello", "John!"];
				const path3 = ["How", "are", "you?"];
				nodeLookup.addPaths([path1, path2, path3]);

				expect(() => nodeLookup.delete(["Hello", "Worldz!", "Yo!", "WOW!", "then"])).not.toThrow();

				let matches = nodeLookup.findMatchingLeafNodes([]);
				expect(matches.matchType).toEqual(MatchType.Descendants);
				expect(matches.paths).toEqual([path1, path2, path3]);
			});

			it("Clears", () => {
				const path1 = ["Hello", "World!"];
				const path2 = ["Hello", "John!"];
				const path3 = ["How", "are", "you?"];
				nodeLookup.addPaths([path1, path2, path3]);

				nodeLookup.clear();

				let matches = nodeLookup.findMatchingLeafNodes([]);
				expect(matches.matchType).toEqual(MatchType.Descendants);
				expect(matches.paths).toEqual([]);
			});
		});
	}
}
