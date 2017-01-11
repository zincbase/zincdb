(function () {
	let globalObject = {};
	
	if (typeof window !== "undefined")
		globalObject = window;
	else if (typeof self !== "undefined")
		globalObject = self;
	else if (typeof global !== "undefined")
		globalObject = global;

	if (typeof globalObject["React"] !== "object") {
		globalObject["React"] = {
			Component: class {},
			PureComponent: class {}
		}
	}
})();