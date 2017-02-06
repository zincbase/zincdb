type DescribeFunc = typeof describe;

namespace ZincDB {
	const globalDescribe = getGlobalObject()["describe"];
	let wrappedDescribe: DescribeFunc;

	const queuedTests: [string, Function][] = [];
	if (typeof globalDescribe === "function") {
		wrappedDescribe = (description, testFunction) => queuedTests.push([description, testFunction]);
	} else {
		wrappedDescribe = () => { };
	}

	export let describe = wrappedDescribe;

	export const installQueuedTests = function() {
		if (typeof globalDescribe === "function") {
			describe = globalDescribe;
			queuedTests.forEach(([description, testFunction]) => globalDescribe(description, testFunction));
			queuedTests.length = 0;
			describe = wrappedDescribe;
		}
	}
}
