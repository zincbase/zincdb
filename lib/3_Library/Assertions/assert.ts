namespace ZincDB {
	export const assert = function<T extends { [argName: string]: any }>(args: T, predicate: (args: T) => boolean): void {
		const getPredicateFunctionBody = () => {
			const predicateSource = predicate.toString();
			const predicateBody = predicateSource.substr(predicateSource.indexOf("{"));
			return predicateBody;
		}

		const getFormattedArgs = (): string => {
			let formattedArgs = "";

			let first = true;

			for (const arg in args) {
				if (!first)
					formattedArgs += ", "

				formattedArgs += `${arg} = ${JSON.stringify(args[arg])}`;
				first = false;
			}

			return formattedArgs;
		}

		let result: boolean;

		try {
			result = predicate(args);
		} catch (e) {
			const errorMessage = `Assertion throwed: ${getFormattedArgs()} errored when checked for ${getPredicateFunctionBody()}. Error: ${createErrorMessage(e)}`;
			log(errorMessage);
			return;
		}

		if (result === false) {
			const errorMessage = `Assertion failed: ${getFormattedArgs()} failed to satisfy ${getPredicateFunctionBody()}`;
			log(errorMessage);
		}
	}
}