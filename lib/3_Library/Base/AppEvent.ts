namespace ZincDB {
	export class AppEvent<T>
	{
		handlers: AppEventHandler<T>[] = [];

		constructor() {
		}

		trigger(eventArgs?: T) {
			for (const handler of this.handlers)
				handler(eventArgs);
		}

		triggerAsync(eventArgs?: T) {
			EventLoop.enqueueImmediate(() => this.trigger(eventArgs));
		}

		addHandler(handler: AppEventHandler<T>) {
			if (!handler)
				throw new TypeError("AppEvent.addHandler: undefined of null handler");

			this.handlers.push(handler);
		}

		addOneTimeHandler(handler: AppEventHandler<T>) {
			if (!handler)
				throw new TypeError("AppEvent.addOneTimeHandler: undefined of null handler");

			const wrappedHandler = (eventArgs?: T) => {
				handler(eventArgs);
				this.removeHandler(wrappedHandler);
			}

			this.handlers.push(wrappedHandler);
		}

		removeHandler(handler: AppEventHandler<T>) {
			if (!handler)
				throw new TypeError("AppEvent.removeHandler: undefined of null handler");

			const index = this.handlers.indexOf(handler);

			if (index >= 0)
				this.handlers.splice(index, 1);
		}

		removeAllHandlers() {
			this.handlers.length = 0;
		}

		containsHandler(handler: AppEventHandler<T>): boolean {
			if (!handler)
				throw new TypeError("AppEvent.containsHandler: undefined of null handler");

			return this.handlers.indexOf(handler) >= 0;
		}

		get hasHandlers(): boolean {
			return this.handlers.length > 0;
		}

		get handlerCount(): number {
			return this.handlers.length;
		}
	}

	export interface AppEventHandler<T> {
		(eventArgs?: T): void;
	}
}