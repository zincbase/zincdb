namespace ZincDB {
	export const enum MatchType { None, Exact, Ancestor, Descendants };
	type NodePath = Keypath.NodePath;
	type EntityPath = Keypath.EntityPath;

	export type NodeLookupMatches = { matchType: MatchType; paths: NodePath[] };

	export class NodeLookup {
		root = {};

		addPathStrings(pathStrings: string[]) {
			for (const pathString of pathStrings)
				this.add(<NodePath>Keypath.parse(pathString));
		}

		addPaths(paths: NodePath[]) {
			for (const path of paths)
				this.add(<NodePath>path);
		}

		add(path: NodePath): void {
			let parentNode = this.root;

			for (let i = 0; i < path.length; i++) {
				const specifier = path[i];

				if (i === path.length - 1) {
					parentNode[specifier] = null;
					return;
				}

				let currentNode = parentNode[specifier];

				if (currentNode == null) // If the current node is missing or a leaf
					currentNode = parentNode[specifier] = {};

				parentNode = currentNode;
			}
		}

		findMatchingLeafNodes(path: EntityPath): NodeLookupMatches {
			let parentNode = this.root;

			for (let i = 0; i < path.length; i++) {
				const specifier = path[i];

				if (typeof specifier === "number")// if the current node has a numeric specifier, it can't be a leaf
					return { matchType: MatchType.None, paths: [] };

				const currentNode = parentNode[specifier];

				if (currentNode === undefined) { // if the current node does not exist 
					return { matchType: MatchType.None, paths: [] }
				} else if (currentNode === null) { // if the current node is a leaf
					if (i === path.length - 1) // if the whole path has been traversed, it is an exact match
						return { matchType: MatchType.Exact, paths: [<NodePath>path] }
					else // otherwise it is an ancestor match
						return { matchType: MatchType.Ancestor, paths: [<NodePath>path.slice(0, i + 1)] }
				}

				parentNode = currentNode;
			}

			return { matchType: MatchType.Descendants, paths: NodeLookup.getDescendantPaths(parentNode, <NodePath>path) }
		}

		delete(path: EntityPath) {
			return this.deleteNode(path, this.root);
		}

		private deleteNode(path: EntityPath, baseNode: any) {
			if (!Array.isArray(path) || path.length === 0)
				throw new Error("Invalid path given");

			if (baseNode == null)
				return;

			const childNodeName = path[0];

			if (path.length === 1) {
				baseNode[childNodeName] = undefined
			} else {
				this.deleteNode(path.slice(1), baseNode[childNodeName]);

				if (!ObjectTools.objectHasAtLeastOneDefinedProperty(baseNode[childNodeName])) {
					baseNode[childNodeName] = undefined;
				}				
			}
		}

		clear() {
			this.root = {};
		}

		static getDescendantPathStrings(obj: any, currentPath: NodePath): string[] {
			return this.getDescendantPaths(obj, currentPath).map((path) => Keypath.stringify(path));
		}

		static getDescendantPaths(obj: any, currentPath: NodePath): NodePath[] {
			const descendantPaths: NodePath[] = [];

			for (const key in obj) {
				const childObj = obj[key];

				if (childObj === null)
					descendantPaths.push([...currentPath, key]);
				else if (childObj === undefined)
					continue;
				else
					descendantPaths.push(...this.getDescendantPaths(childObj, [...currentPath, key]));
			}

			return descendantPaths;
		}
	}
}