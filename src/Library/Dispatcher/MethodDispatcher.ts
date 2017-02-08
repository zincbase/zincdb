namespace ZincDB {
	export class MethodDispatcher implements Dispatcher<any> {
		constructor(private handlerMap: object) {
			if (typeof handlerMap !== "object")
				throw new TypeError("Handler object is not an object.");
		}

		async exec(target: string, operation: string, args: any[]): Promise<any> {
			const handler: Function = this.handlerMap[operation];

			if (typeof handler !== "function")
				throw new Error(`Invalid or missing handler for '${operation}.'`);

			const result = handler.apply(this.handlerMap, args);

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
}
