namespace ZincDB {
	export namespace URLParser {
		export const parseURLWithDOM = function(url: string): { hash: string; host: string; hostname: string; href: string; pathname: string; port: string; protocol: string; } {
			if (typeof url !== "string" || url.length === 0)
				throw new TypeError("Invalid URL given");

			const dummyAnchorElement = document.createElement('a');
			dummyAnchorElement.href = url;

			return dummyAnchorElement;
		}
	}
}