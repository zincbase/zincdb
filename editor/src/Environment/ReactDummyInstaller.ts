namespace ZincDB {
	if (typeof getGlobalObject()["React"] !== "object") {
		getGlobalObject()["React"] = {
			Component: class {},
			PureComponent: class {}
		}
	}
}
