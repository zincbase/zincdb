/// <reference path="../LocalDBOperations.ts"/>

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
					if (typeof encodedMessage !== "string" || encodedMessage.indexOf(this.dispatcher.baseToken) === -1)
						return;

					//log(`Worker response: ${encodedMessage}`);

					const message: TokenizedResponse = Encoding.OmniJson.decode(encodedMessage);

					if (message.error)
						message.error = new Error(message.error.message);

					this.dispatcher.announceResponse(message);
				});

				this.worker.on("error", (err: Error) => {
					this.dispatcher.abortAllPendingOperations(err);
				});
			}

			async exec(target: string, operation: string, args: any[]) {
				return this.dispatcher.exec(target, operation, args);
			}
		}

		const initializeIfRunningInNodeWorker = function () {
			if (!runningInNodeChildProcess())
				return;

			const encode = Encoding.OmniJson.encode;
			const decode = Encoding.OmniJson.decode;

			const targets: { [databaseName: string]: MethodDispatcher } = {};

			process.on("message", async (encodedMessage: string, sendHandle?: any) => {
				if (typeof encodedMessage !== "string" || encodedMessage.indexOf("TokenizedDispatcherMessage_") === -1)
					return;

				//log(`Main process request: ${encodedMessage}`);
				const message: TokenizedRequest = decode(encodedMessage);

				if (targets[message.target] === undefined)
					targets[message.target] = new SerializingMethodDispatcher(new LocalDBOperations());

				const operations = targets[message.target];

				try {
					const returnValue = await operations.exec(message.target, <any>message.operation, message.args)

					const responseMessage: TokenizedResponse = { target: message.target, operation: message.operation, result: returnValue, token: message.token };
					process.send!(encode(responseMessage));
				}
				catch (err) {
					let errObject;

					if (err instanceof Error) {
						errObject = { name: err.name, message: err.message, stack: err.stack }
					} else {
						errObject = { name: "error", message: JSON.stringify(err) }
					}

					const responseMessage: TokenizedResponse = { target: message.target, operation: message.operation, error: errObject, token: message.token }
					process.send!(encode(responseMessage));
				}
			});
		}

		initializeIfRunningInNodeWorker();
	}
}
