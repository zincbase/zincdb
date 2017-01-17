/// <reference path="LocalDBOperations.ts"/>

namespace ZincDB {
	if (runningInNodeJS()) {
		//global["Worker"] = require("tiny-worker");
	}

	export namespace DB {
		export class LocalDBWorkerDispatcher implements Dispatcher<LocalDBOperationsSchema> {
			worker: Worker;
			dispatcher: TokenizedDispatcher;

			constructor(workerScriptPath: string) {
				this.worker = new Worker(workerScriptPath);
				this.dispatcher = new TokenizedDispatcher((request) => this.worker.postMessage(request));

				this.worker.addEventListener("message", (event) => {
					const message: TokenizedResponse = event.data;
					//log(`Worker response: ${JSON.stringify(message)}`);

					if (message.error)
						message.error = new Error(message.error.message);

					if (message.operation === "close" || message.operation === "destroyLocalData")
						this.worker.terminate();

					this.dispatcher.announceResponse(message);
				});

				this.worker.addEventListener("error", (event) => {
					this.dispatcher.abortAllPendingOperations(new Error(event.error.message));
				});
			}

			async exec(operation: string, args: any[]) {
				return this.dispatcher.exec(operation, args);
			}
		}

		const initializeIfRunningInWorker = function () {
			let operations: Dispatcher<any>;

			if (runningInWebWorker()) {
				//importScripts("promise.js");
				operations = new MethodDispatcher(new LocalDBOperations());

				self.addEventListener("message", onMessage);

				self.addEventListener("error", (e: ErrorEvent) => {
					printExceptionAndStackTraceToConsole(e, "LocalDB Web Worker exception");
				});
			}

			function onMessage(event: MessageEvent) {
				const message: TokenizedRequest = event.data;

				if (!Tools.stringStartsWith(message.token, "TokenizedDispatcherMessage"))
					return;

				//log(`Main thread request: ${JSON.stringify(message)}`);					

				operations.exec(<any>message.operation, message.args).then((returnValue) => {
					self.postMessage({ operation: message.operation, result: returnValue, token: message.token }, <any>[]);

					if (message.operation === "close" || message.operation === "destroyLocalData")
						self.close();
				}).catch((err) => {
					let errObject;

					if (err instanceof Error) {
						errObject = { name: err.name, message: err.message, stack: err.stack }
					} else {
						errObject = { name: "error", message: JSON.stringify(err) }
					}

					self.postMessage({ operation: message.operation, error: errObject, token: message.token }, <any>[]);

					if (message.operation === "close" || message.operation === "destroyLocalData")
						self.close();
				});
			}
		}

		initializeIfRunningInWorker();
	}
}
