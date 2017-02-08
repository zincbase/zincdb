namespace ZincDB {
	export const expectPromiseToReject = function (promise: Promise<any>) {
		return promise
			.then(
			() => expect(true).toBe(false, "Expected promise to reject"),
			() => expect(true).toBe(true))
	}

	export const expectPromiseToResolve = function(promise: Promise<any>) {
		return promise
			.then(
			() => expect(true).toBe(true),
			() => expect(true).toBe(false, "Expected promise to resolve"))
	}

	export const seededRand = function () {
	}
}
