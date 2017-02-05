namespace ZincDB {
	export interface DispatcherSchema { [name: string]: { Args: any[]; ReturnValue: any } };

	export interface Dispatcher<Schema extends DispatcherSchema> {
		exec<K extends keyof Schema>(target: string, name: K, args: Schema[K]['Args'], options?: object): Promise<Schema[K]['ReturnValue']>;
	}

	export class MethodDispatcher implements Dispatcher<any> {
		constructor(private handlerObject: object) {
			if (typeof handlerObject !== "object")
				throw new TypeError("Handler object is not an object.");
		}

		async exec(target: string, operation: string, args: any[]): Promise<any> {
			const handler: Function = this.handlerObject[operation];

			if (typeof handler !== "function")
				throw new Error(`Invalid or missing handler for '${operation}.'`);
			
			const result = handler.apply(this.handlerObject, args);

			if (result instanceof Promise)
				return result;
			else
				return Promise.resolve(result);
		}
	}

	export class SerializingMethodDispatcher extends MethodDispatcher {
		private promiseQueue = new PromiseQueue();

		async exec(target: string, operation: string, args: any[]): Promise<any> {
			return this.promiseQueue.add(() => super.exec(target, operation, args));
		}
	}

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