namespace ZincDB {
	export type TokenizedRequest = {
		target: string;
		operation: string;
		args: any[];
		token: string;
	}

	export type TokenizedResponse = {
		target: string;
		operation: string;
		result?: any;
		error?: Error;
		token: string;
	}

	export type TokenizedRequestHandler = (request: TokenizedRequest, options?: object) => void
	export type TokenizedResponseHandler = (response: TokenizedResponse) => void

	export class TokenizedDispatcher implements Dispatcher<any> {
		public readonly baseToken: string;
		private responseHandlers: Map<string, TokenizedResponseHandler>

		constructor(private requestHandler: TokenizedRequestHandler) {
			if (typeof requestHandler !== "function")
				throw new TypeError("Invalid request handler provided");

			this.baseToken = "TokenizedDispatcherMessage_" + Crypto.Random.getAlphanumericString(16);
			this.responseHandlers = new StringMap<TokenizedResponseHandler>();
		}

		exec(target: string, operation: string, args: any[], options?: object): Promise<any> {
			return new Promise((resolve, reject) => {
				const requestMessage: TokenizedRequest = {
					target,
					operation,
					args,
					token: this.baseToken + "_" + Crypto.Random.getAlphanumericString(16)
				}

				this.responseHandlers.set(requestMessage.token, (response) => {
					this.responseHandlers.delete(requestMessage.token);

					if (response.error == null)
						resolve(response.result);
					else
						reject(response.error);
				});

				this.requestHandler(requestMessage, options);
			})
		}

		announceResponse(responseMessage: TokenizedResponse) {
			const matchingResponseHandler = this.responseHandlers.get(responseMessage.token);

			if (matchingResponseHandler)
				matchingResponseHandler(responseMessage);
		}

		abortAllPendingOperations(e: any) {
			this.responseHandlers.forEach((callback, token) => {
				callback({ target: "", token, operation: "", error: e });
			});

			this.responseHandlers.clear();
		}

		isOwnMessage(message: TokenizedRequest | TokenizedResponse): boolean {
			return message && typeof message.token === "string" && Tools.stringStartsWith(message.token, this.baseToken);
		}
	}
}
