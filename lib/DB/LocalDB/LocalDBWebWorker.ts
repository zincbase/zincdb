/// <reference path="LocalDBOperations.ts"/>

namespace ZincDB {
	export namespace DB {
		export class LocalDBWebWorkerDispatcher implements Dispatcher<LocalDBOperationsSchema> {
			worker: Worker;
			dispatcher: TokenizedDispatcher;

			constructor(workerScriptPath: string) {
				this.worker = new Worker(workerScriptPath);
				this.dispatcher = new TokenizedDispatcher((request, options) => {
					if (options && options["transferList"] && navigator.appVersion.indexOf("MSIE 10") === -1) {
						//log(options["transferList"][0]["byteLength"]);
						this.worker.postMessage(request, options["transferList"])
					}
					else {
						this.worker.postMessage(request)
					}
				});

				this.worker.addEventListener("message", (event) => {
					const message: TokenizedResponse = event.data;

					if (!this.dispatcher.isOwnMessage(message))
						return;

					//log(`Worker response: ${JSON.stringify(message)}`);

					if (message.error)
						message.error = new Error(message.error.message);

					this.dispatcher.announceResponse(message);
				});

				this.worker.addEventListener("error", (event) => {
					this.dispatcher.abortAllPendingOperations(new Error(event.error.message));
				});
			}

			async exec(target: string, operation: string, args: any[], options?: { transferList: ArrayBuffer[] }) {
				return this.dispatcher.exec(target, operation, args, options);
			}
		}

		const initializeIfRunningInWebWorker = function () {
			if (!runningInWebWorker())
				return;

			const targets: { [databaseName: string]: MethodDispatcher } = {};

			self.addEventListener("message", async (event: MessageEvent) => {
				const message: TokenizedRequest = event.data;

				if (!Tools.stringStartsWith(message.token, "TokenizedDispatcherMessage"))
					return;

				//log(`Main thread request: ${JSON.stringify(message)}`);

				if (targets[message.target] === undefined)
					targets[message.target] = new SerializingMethodDispatcher(new LocalDBOperations());

				const operations = targets[message.target];

				try {
					const returnValue = await operations.exec(message.target, <any>message.operation, message.args);
					const responseMessage: TokenizedResponse = { target: message.target, operation: message.operation, result: returnValue, token: message.token }

					//log(ObjectTools.deepSearchTransferableObjects(responseMessage));
					if (navigator.appVersion.indexOf("MSIE 10") >= 0)
						self.postMessage(responseMessage, <any>[]);
					else
						self.postMessage(responseMessage, <any>ObjectTools.deepSearchTransferableObjects(responseMessage));
				}
				catch (err) {
					let errObject;

					if (err instanceof Error) {
						errObject = { name: err.name, message: err.message, stack: err.stack }
					} else {
						errObject = { name: "error", message: JSON.stringify(err) }
					}

					const responseMessage: TokenizedResponse = { target: message.target, operation: message.operation, error: errObject, token: message.token };
					self.postMessage(responseMessage, <any>[]);
				}
			});

			self.addEventListener("error", (e: ErrorEvent) => {
				printExceptionAndStackTraceToConsole(e, "LocalDB Web Worker exception");
			});
		}

		initializeIfRunningInWebWorker();
	}
}
