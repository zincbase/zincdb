/// <reference path="LocalDBOperations.ts"/>

namespace ZincDB {
	export namespace DB {
		export class LocalDBNodeWorkerDispatcher implements Dispatcher<LocalDBOperationsSchema> {
			worker: child_process.ChildProcess;
			dispatcher: TokenizedDispatcher;

			constructor() {
				const NodeChildProcess: typeof child_process = require('child_process');

				this.worker = NodeChildProcess.fork(__filename);

				this.dispatcher = new TokenizedDispatcher((request) => {
					this.worker.send(Encoding.OmniJson.encode(request))
				});

				this.worker.on("message", (encodedMessage: string) => {
					//log(`Worker response: ${encodedMessage}`);

					const message: TokenizedResponse = Encoding.OmniJson.decode(encodedMessage);

					if (message.error)
						message.error = new Error(message.error.message);

					if (message.operation === "close" || message.operation === "destroyLocalData")
						this.worker.kill();

					this.dispatcher.announceResponse(message);
				});

				this.worker.on("error", (err: Error) => {
					this.dispatcher.abortAllPendingOperations(err);
				});
			}

			async exec(operation: string, args: any[]) {
				return this.dispatcher.exec(operation, args);
			}
		}

		const initializeIfRunningInNodeWorker = function () {
			if (!runningInNodeJS() || typeof process.send !== "function")
				return;
			
			const encode = Encoding.OmniJson.encode;
			const decode = Encoding.OmniJson.decode;

			const operations = new MethodDispatcher(new LocalDBOperations());

			process.on("message", async (encodedMessage: any, sendHandle?: any) => {
				//log(`Main process request: ${encodedMessage}`);

				const message = decode(encodedMessage);

				try {
					const returnValue = await operations.exec(<any>message.operation, message.args)

					process.send!(encode({ operation: message.operation, result: returnValue, token: message.token }));

					if (message.operation === "close" || message.operation === "destroyLocalData")
						process.exit();
				}
				catch (err) {
					let errObject;

					if (err instanceof Error) {
						errObject = { name: err.name, message: err.message, stack: err.stack }
					} else {
						errObject = { name: "error", message: JSON.stringify(err) }
					}

					process.send!(encode({ operation: message.operation, error: errObject, token: message.token }));

					if (message.operation === "close" || message.operation === "destroyLocalData")
						process.exit();
				}
			});
		}

		initializeIfRunningInNodeWorker();
	}
}