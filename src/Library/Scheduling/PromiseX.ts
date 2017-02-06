namespace ZincDB {
	export namespace PromiseX {
		export const delay = function(ms: number): Promise<void> {
			return new Promise<void>((resolve, reject) => {
				setTimeout(() => resolve(), ms);
			});
		}

		export const yield = function(): Promise<void> {
			return new Promise<void>((resolve, reject) => {
				EventLoop.enqueueImmediate(() => resolve());
			});
		}

		export const start = function<R>(exectutor?: (value: any) => R | PromiseLike<R>): Promise<R> {
			if (exectutor)
				return Promise.resolve().then(exectutor);
			else
				return <Promise<any>> Promise.resolve();
		}

		export const waitForAppEvent = function<T>(appEvent: AppEvent<T>): Promise<T> {
			return new Promise((resolve, reject) => {
				appEvent.addOneTimeHandler((value) => {
					resolve(value);
				});
			});
		}
	}

	export var OpenPromise: { new <R>(): OpenPromise<R> } = <any>function <R>(): OpenPromise<R> {
		let resolveFunc: (value?: R | PromiseLike<R>) => void = () => {
			throw new Error("Could not create OpenPromise object as the Promise constructor callback didn't execute synchronously");
		};

		let rejectFunc: (error?: any) => void = () => {
			throw new Error("Could not create OpenPromise object as the Promise constructor callback didn't execute synchronously");
		};

		// Note the assumption here is that the constructor callback is executed synchronously!
		const newPromise = <OpenPromise<R>>new Promise<R>((resolve, reject) => {
			resolveFunc = resolve;
			rejectFunc = reject;
		});
		
		newPromise.resolve = resolveFunc;
		newPromise.reject = rejectFunc;
		newPromise.cancel = () => newPromise.reject(new PromiseCanceledError());

		return newPromise;
	}

	export interface OpenPromise<R> extends Promise<R> {
		resolve: (value?: R | PromiseLike<R>) => void;
		reject: (error?: any) => void;
		cancel: () => void;
	}

	export class PromiseCanceledError extends Error {
		name = "PromiseCanceledError";
	}
}