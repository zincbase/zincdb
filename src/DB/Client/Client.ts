namespace ZincDB {
	export namespace DB {
		export type ClientOptions = {
			datastoreURL: string;
			accessKey?: string;
			encryptionKey?: string;
			verifyServerCertificate?: boolean;
			verifyChecksums?: boolean;
			addChecksums?: boolean;
			timeout?: number;
		}

		export type WriteResponseObject = {
			commitTimestamp: number;
		}

		export type ServerMetadata = {
			lastModified: number;
			lastRewritten: number;
		}

		export class Client<V> {
			private abortSignalSource = new SignalSource();

			constructor(public options: ClientOptions) {
				//if (!options || typeof options.datastoreURL !== "string" || options.datastoreURL === "")
				//	throw new TypeError("Client constructor: options argument must be passed and specify a valid 'datastoreURL' property");

				options = ObjectTools.override({
					datastoreURL: "",
					accessKey: undefined,
					encryptionKey: undefined,
					verifyServerCertificate: true,
					verifyChecksums: false,
					addChecksums: false,
					timeout: 0,
				}, options);
			}

			async read(options: { updatedAfter?: number, compactResults?: boolean, waitUntilNonempty?: boolean } = {}): Promise<EntryArray<V>> {
				options = ObjectTools.override({
					compactResults: true,
				}, options)

				const response = await this.readRaw({ updatedAfter: options.updatedAfter, waitUntilNonempty: options.waitUntilNonempty });
				const results = this.deserializeGetResponseBody(<Uint8Array>response.body, options.compactResults);
				return results;
			}

			async readRaw(options: { updatedAfter?: number, waitUntilNonempty?: boolean }): Promise<HTTPClientResponse> {
				options = ObjectTools.override({
				}, options)

				return await HTTPClient.requestAndErrorOnUnexpectedResponse({
					url: this.buildRequestURL({ updatedAfter: options.updatedAfter, waitUntilNonempty: options.waitUntilNonempty }),
					method: "GET",
					responseType: "arraybuffer",
					abortSignalSource: this.abortSignalSource,
					verifyServerCertificate: this.options.verifyServerCertificate,
					timeout: options.waitUntilNonempty === true ? 0 : this.options.timeout
				});
			}

			async write(newRevisions: EntryArray<V>): Promise<WriteResponseObject> {
				if (!Array.isArray(newRevisions))
					throw new TypeError("New revisions argument is not an array");

				const serializedEntries = DB.EntrySerializer.serializeEntries(newRevisions, this.options.encryptionKey, this.options.addChecksums);
				return this.writeRaw(serializedEntries);
			}

			async writeRaw(content: Uint8Array): Promise<WriteResponseObject> {
				if (!(content instanceof Uint8Array))
					throw new TypeError("Content argument is not a Uint8Array");

				const response = await HTTPClient.requestAndErrorOnUnexpectedResponse({
					url: this.buildRequestURL(),
					method: "POST",
					body: content,
					abortSignalSource: this.abortSignalSource,
					verifyServerCertificate: this.options.verifyServerCertificate,
					timeout: this.options.timeout
				})

				return Client.parseJSONObjectFromResponseBody<WriteResponseObject>(response);
			}

			async rewrite(newRevisions: EntryArray<V>): Promise<WriteResponseObject> {
				if (!Array.isArray(newRevisions))
					throw new TypeError("New revisions argument is not an array");

				return await this.rewriteRaw(DB.EntrySerializer.serializeEntries(newRevisions, this.options.encryptionKey, this.options.addChecksums));
			}

			async rewriteRaw(content: Uint8Array): Promise<WriteResponseObject> {
				if (!(content instanceof Uint8Array))
					throw new TypeError("Content argument is not a Uint8Array");

				const response = await HTTPClient.requestAndErrorOnUnexpectedResponse({
					url: this.buildRequestURL(),
					method: "PUT",
					body: content,
					abortSignalSource: this.abortSignalSource,
					verifyServerCertificate: this.options.verifyServerCertificate,
					timeout: this.options.timeout
				})

				return Client.parseJSONObjectFromResponseBody<WriteResponseObject>(response);
			}

			async destroyRemoteData(): Promise<HTTPClientResponse> {
				return await HTTPClient.requestAndErrorOnUnexpectedResponse({
					url: this.buildRequestURL(),
					method: "DELETE",
					abortSignalSource: this.abortSignalSource,
					verifyServerCertificate: this.options.verifyServerCertificate,
					timeout: this.options.timeout
				});
			}

			async openRawWebsocketReader(options: { updatedAfter?: number }, callback: (message: Uint8Array) => Promise<void>): Promise<void> {
				options = ObjectTools.override({
					compactResults: true,
				}, options);

				if (typeof callback !== "function")
					throw new TypeError("Callback argument is not a function");

				const connectionPromise = new OpenPromise<void>();
				const url = this.buildRequestURL({ updatedAfter: options.updatedAfter }).replace(/^http/, "ws");
				const webSocket = new WebSocket(url);
				webSocket.binaryType = "arraybuffer";

				const onAbortSignal = () => {
					connectionPromise.cancel();
					webSocket.close();
				}
				this.abortSignalSource.subscribe(onAbortSignal);

				const handlerQueue = new PromiseQueue();

				webSocket.onopen = (e: Event) => {
					//log(`Connection to websocket '${url}' opened.`)
				}

				webSocket.onmessage = (e: MessageEvent) => {
					handlerQueue.add(() => callback(new Uint8Array(e.data)))
						.catch((e) => {
							webSocket.close();

							if (e.name === "PromiseCanceledError")
								connectionPromise.cancel();
							else
								connectionPromise.reject(e);
						});
				}

				webSocket.onerror = (e: ErrorEvent) => {
					connectionPromise.reject(new NetworkError(`Websocket connection with ${url} errored.`));
					this.abortSignalSource.unsubscribe(onAbortSignal);
				}

				webSocket.onclose = (e: CloseEvent) => {
					connectionPromise.reject(new NetworkError(`Websocket connection with ${url} was closed unexpectedly.`));

					this.abortSignalSource.unsubscribe(onAbortSignal);

					//log(`Connection to websocket '${url}' closed.`)
				}

				await connectionPromise;
			}

			private buildRequestURL(options?: { [key: string]: any }) {
				const argumentStrings: string[] = [];

				if (options) {
					for (const key in options)
						if (key && options[key] != null && options[key] != "")
							argumentStrings.push(`${key}=${options[key]}`);
				}

				if (this.options.accessKey)
					argumentStrings.push(`accessKey=${this.options.accessKey}`);

				if (argumentStrings.length > 0)
					return `${this.options.datastoreURL}?${argumentStrings.join("&")}`;
				else
					return `${this.options.datastoreURL}`;
			}

			private deserializeGetResponseBody(responseBody: Uint8Array, compact: boolean = false): EntryArray<V> {
				let results: Entry<any>[];

				if (compact)
					results = DB.EntrySerializer.compactAndDeserializeEntries(responseBody, this.options.encryptionKey, this.options.verifyChecksums);
				else
					results = DB.EntrySerializer.deserializeEntries(responseBody, this.options.encryptionKey, this.options.verifyChecksums);

				return results;
			}

			async abortActiveRequests(): Promise<void> {
				await this.abortSignalSource.signal();
			}

			private static parseJSONObjectFromResponseBody<T>(response: HTTPClientResponse): T {
				if (response.statusCode === 200) {
					if (typeof response.body === "string") {
						let parsedBody: any;

						try {
							parsedBody = JSON.parse(<string>response.body);
						}
						catch (e) {
							throw new Error(`Could not parse response body '${response.body}' as JSON.`);
						}

						return parsedBody;
					}
					else {
						throw new Error("Response body did not have type 'string'");
					}
				} else {
					throw new Error("Response has status code other than 200 OK");
				}
			}
		}
	}

	export var Client = DB.Client;
}
