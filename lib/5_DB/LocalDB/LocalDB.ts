namespace ZincDB {
	export namespace DB {
		export class LocalDB {
			readonly options: LocalDBOptions;
			readonly syncClient: Client<any>;
			protected readonly operations: Dispatcher<LocalDBOperationsSchema>;
			protected readonly subscriberEntries: Map<string, SubscriptionTarget> = new StringMap<SubscriptionTarget>();
			isClosed: boolean = false;

			////////////////////////////////////////////////////////////////////////////////////////////////
			// Initialization operations
			////////////////////////////////////////////////////////////////////////////////////////////////
			constructor(public readonly name: string, customOptions?: LocalDBOptions) {
				if (typeof name !== "string")
					throw new Error("Missing or invalid DB name.");

				this.options = <LocalDBOptions>ObjectTools.override({
					remoteSyncURL: "",
					remoteAccessKey: "",
					encryptionKey: undefined,
					storageMedium: "InMemory",
					useWebWorker: false,
					pullAfterOpened: false,
					workerURI: undefined
				}, customOptions);

				this.syncClient = new Client<any>({
					datastoreURL: this.options.remoteSyncURL,
					accessKey: this.options.remoteAccessKey,
					encryptionKey: this.options.encryptionKey
				});

				if (this.options.useWebWorker === true && webWorkersAvailable()) {
					let scriptURI = this.options.workerURI;

					if (!scriptURI) {
						if (typeof document === "undefined")
							throw new Error("Couldn't start a worker as a document object was not found.");

						const scriptElement = document.getElementById("zincdb");

						if (!scriptElement || !scriptElement["src"])
							throw new Error("Couldn't start a worker as a document script element with the id 'zincdb' wasn't found.");
							
						scriptURI = scriptElement["src"];
					}

					this.operations = new LocalDBWorkerDispatcher(scriptURI!);
				} else {
					this.operations = new MethodDispatcher(new LocalDBOperations());
				}
			}

			async open() {
				await this.operations.exec("open", [this.name, this.options]);
			}

			////////////////////////////////////////////////////////////////////////////////////////////////
			// Write operations
			////////////////////////////////////////////////////////////////////////////////////////////////
			async put(path: NodePath, newValue: any): Promise<void> {
				if (this.isClosed)
					throw new Error("Database has been closed.");

				if (newValue === undefined)
					throw new TypeError(`An undefined value supplied. To delete nodes please use the delete() method instead.`);

				await this.commitLocalTransaction([{ type: OperationType.Put, path: path, value: newValue }]);
			}

			async delete(path: NodePath): Promise<void> {
				if (this.isClosed)
					throw new Error("Database has been closed.");

				await this.commitLocalTransaction([{ type: OperationType.Delete, path: path }]);
			}

			async update(path: EntityPath, newValue: any): Promise<void> {
				if (this.isClosed)
					throw new Error("Database has been closed.");

				await this.commitLocalTransaction([{ type: OperationType.Update, path: path, value: newValue }]);
			}

			async addListItem(listPath: NodePath, value: any): Promise<string> {
				if (this.isClosed)
					throw new Error("Database has been closed.");

				const newItemKey = randKey();
				await this.commitLocalTransaction([{ type: OperationType.Put, path: [...listPath, newItemKey], value }]);
				return newItemKey;
			}

			transaction() {
				return new LocalDBTransaction(this);
			}

			async commitLocalTransaction(transaction: Transaction): Promise<void> {
				const diff = await this.operations.exec("commitLocalTransaction", [transaction]);
				await this.announceChanges("local", diff);
			}

			async commitLocalRevisions(newRevisions: EntryArray<any>) {
				const diff = await this.operations.exec("commitLocalRevisions", [newRevisions]);
				await this.announceChanges("local", diff);
			}

			protected async commitSerializedRemoteRevisions(serializedRevisions: Uint8Array) {
				const diff = await this.operations.exec("commitSerializedRemoteRevisions", [serializedRevisions, this.options.encryptionKey]);
				await this.announceChanges("remote", diff);
			}

			protected async setAsRemotelyCommited(keys: string[], commitTimestamp: number) {
				return this.operations.exec("setAsRemotelyCommited", [keys, commitTimestamp]);
			}

			////////////////////////////////////////////////////////////////////////////////////////////////
			// Read operations
			////////////////////////////////////////////////////////////////////////////////////////////////
			async get(path: EntityPath): Promise<any>;
			async get(paths: EntityPath[]): Promise<any[]>;
			async get(pathOrPaths: EntityPath | EntityPath[]): Promise<any | any[]> {
				if (this.isClosed)
					throw new Error("Database has been closed.");

				if (!Array.isArray(pathOrPaths))
					throw new TypeError("Invalid first argument provided: must be an array array.");

				if (Array.isArray(pathOrPaths[0])) {
					const paths = <EntityPath[]>pathOrPaths;
					return Promise.all(paths.map((path) => this.getEntity(path)));
				} else {
					return this.getEntity(<EntityPath>pathOrPaths);
				}
			}

			protected async getEntity(path: EntityPath): Promise<any> {
				return this.operations.exec("getEntity", [path]);
			}

			async getAllEntries(): Promise<EntryArray<any>> {
				return this.operations.exec("getAllEntries", []);
			}

			async getAllKeys(): Promise<string[]> {
				return this.operations.exec("getAllKeys", []);
			}

			async getAll(): Promise<PathEntries> {
				return this.operations.exec("getAll", []);
			}

			////////////////////////////////////////////////////////////////////////////////////////////////
			// Watch operations
			////////////////////////////////////////////////////////////////////////////////////////////////
			subscribe(path: EntityPath, handler: SubscriberHandler) {
				return this.subscribeOrObserve(path, handler, false);
			}

			observe(path: EntityPath, handler: SubscriberHandler) {
				return this.subscribeOrObserve(path, handler, true);
			}

			subscribeOrObserve(path: EntityPath, handler: SubscriberHandler, isObserver: boolean) {
				if (this.isClosed)
					throw new Error("Database has been closed.");

				LocalDBOperations.validateEntityPath(path);

				if (typeof handler !== "function")
					throw new TypeError("Missing or invalid handler argument");

				const pathString = Keypath.stringify(path);

				let subscriberEntry = this.subscriberEntries.get(pathString);

				if (subscriberEntry === undefined) {
					subscriberEntry = { path, pathString, subscribers: [] };
					this.subscriberEntries.set(pathString, subscriberEntry)
				}

				subscriberEntry.subscribers.push({ handler, isObserver });
			}

			unsubscribe(handler: SubscriberHandler) {
				if (this.isClosed)
					throw new Error("Database has been closed.");

				this.subscriberEntries.forEach((subscriberEntry) => {
					for (let i = 0; i < subscriberEntry.subscribers.length; i++) {
						const subscriber = subscriberEntry.subscribers[i];

						if (handler === subscriber.handler) {
							subscriberEntry.subscribers.splice(i, 1);
							break;
						}
					}
				});
			}

			unobserve(handler: SubscriberHandler) {
				return this.unsubscribe(handler);
			}

			async announceChanges(origin: "local" | "remote", diff: EntryArray<any>) {
				const subscriptionTargets: SubscriptionTarget[] = [];
				this.subscriberEntries.forEach((subscriptionTarget) => { subscriptionTargets.push(subscriptionTarget); });

				for (const subscriptionTarget of subscriptionTargets) {
					if (subscriptionTarget.subscribers.length === 0)
						continue;

					const subscriptionPathString = subscriptionTarget.pathString;
					const matchingRevisions: EntryArray<any> = [];

					let matchType: Keypath.Relationship = Keypath.Relationship.None;

					for (const entry of diff) {
						const key = entry.key;

						matchType = Keypath.determineStringRelationship(key, subscriptionPathString);
						if (matchType === Keypath.Relationship.None)
							continue;

						matchingRevisions.push(entry);

						if (matchType !== Keypath.Relationship.Descendant)
							break;
					}

					if (matchType === Keypath.Relationship.None)
						continue;

					const updatedValueNeeded = subscriptionTarget.subscribers.some((subscriber) => subscriber.isObserver);

					let updatedValue: any = undefined;

					if (updatedValueNeeded) {
						if (matchType === Keypath.Relationship.Equal) {
							updatedValue = matchingRevisions[0].value;
						} else if (matchType === Keypath.Relationship.Ancestor) {
							const ancestorValue = matchingRevisions[0].value;
							const ancestorPath = Keypath.parse(matchingRevisions[0].key);
							updatedValue = Keypath.getValueByKeypath(ancestorValue, subscriptionTarget.path.slice(ancestorPath.length));
						} else {
							updatedValue = await this.getEntity(subscriptionTarget.path);
						}
					}

					const changeList: PathEntries = matchingRevisions.map((entry) => {
						return {
							path: <NodePath>Keypath.parse(entry.key),
							value: entry.value,
							metadata: entry.metadata
						}
					});

					for (const subscriber of subscriptionTarget.subscribers) {
						let changesObject: ChangesObject;

						if (subscriber.isObserver)
							changesObject = { origin, revisions: changeList, newValue: updatedValue };
						else
							changesObject = { origin, revisions: changeList };

						EventLoop.enqueueImmediate(() => subscriber.handler(changesObject));
					}
				}
			}

			////////////////////////////////////////////////////////////////////////////////////////////////
			// Remote revision sync operations
			////////////////////////////////////////////////////////////////////////////////////////////////
			async pullRemoteRevisions(options?: { continuous?: boolean; useWebSocket?: boolean }) {
				if (this.isClosed)
					throw new Error("Database has been closed.");

				options = ObjectTools.override({ continuous: false, useWebSocket: webSocketsAvailable() }, options);

				if (options.continuous) {
					if (options.useWebSocket && webSocketsAvailable())
						await this.startWebsocketRemoteRevisionsSync();
					else
						await this.startLongPollingRemoteRevisionsSync();
				} else {
					await this.pullRemoteRevisionsOnce(false);
				}
			}

			protected async pullRemoteRevisionsOnce(enableLongPolling: boolean): Promise<void> {
				if (this.isClosed)
					throw new Error("Database has been closed.");

				const currentServerMetadata = await this.getLatestServerMetadata();
				const response = await this.syncClient.readRaw({
					updatedAfter: currentServerMetadata.lastModified,
					waitUntilNonempty: enableLongPolling,
				});

				const serializedEntries = <Uint8Array>response.body;

				if (this.isClosed || serializedEntries.length === 0)
					return;

				await this.commitSerializedRemoteRevisions(serializedEntries);
			}

			protected async startLongPollingRemoteRevisionsSync() {
				if (this.isClosed)
					throw new Error("Database has been closed.");

				let successfulPollCount = 0;
				let lastSuccessfulPollStartTime = 0;

				const initialErrorDelayTime = 250;
				const maxErrorDelayTime = 30000;
				const minIntervalBetweenRequests = 0;

				let errorDelayTime = initialErrorDelayTime;

				while (true) {
					if (this.isClosed)
						return;

					const currentTime = Timer.getTimestamp();
					const timeFromPreviousSyncStart = currentTime - lastSuccessfulPollStartTime;
					const neededWaitTime = minIntervalBetweenRequests - timeFromPreviousSyncStart;

					if (neededWaitTime > 0)
						await PromiseX.delay(neededWaitTime);

					if (this.isClosed)
						return;

					try {
						await this.pullRemoteRevisionsOnce(true);
						lastSuccessfulPollStartTime = Timer.getTimestamp();
						successfulPollCount++;

						errorDelayTime = initialErrorDelayTime;
					}
					catch (e) {
						if (this.isClosed || e.name === "PromiseCanceledError")
							return;

						if (e.name === "NetworkError" || e.name === "HTTPError") {
							printExceptionAndStackTraceToConsole(e, `Remote revisions sync with '${this.options.remoteSyncURL}' has encountered a network error`);
							log(`Retrying in ${errorDelayTime}ms..`);

							await PromiseX.delay(errorDelayTime);

							errorDelayTime = Math.min(errorDelayTime * 2, maxErrorDelayTime);
						} else {
							printExceptionAndStackTraceToConsole(e, `Remote revisions sync with '${this.options.remoteSyncURL}' has stopped due to a fatal error`);
							throw e;
						}
					}
				}
			}

			protected async startWebsocketRemoteRevisionsSync() {
				let receivedMessagesCount = 0;

				const initialErrorDelayTime = 250;
				const maxErrorDelayTime = 30000;

				let errorDelayTime = initialErrorDelayTime;

				while (true) {
					try {
						if (this.isClosed)
							return;

						const latestMetadata = await this.getLatestServerMetadata();

						await this.syncClient.openRawWebsocketReader({
							updatedAfter: latestMetadata.lastModified
						}, async (message) => {
							if (this.isClosed)
								throw new PromiseCanceledError();

							await this.commitSerializedRemoteRevisions(message);

							receivedMessagesCount++;
							errorDelayTime = initialErrorDelayTime;
						});
					}
					catch (e) {
						if (this.isClosed || (e && e.name === "PromiseCanceledError"))
							return;

						if (e.name === "NetworkError" || e.name === "HTTPError") {
							printExceptionAndStackTraceToConsole(e, `Remote revisions websocket sync with '${this.options.remoteSyncURL}' has encountered a network error`);
							log(`Retrying in ${errorDelayTime}ms..`);

							await PromiseX.delay(errorDelayTime);
							errorDelayTime = Math.min(errorDelayTime * 2, maxErrorDelayTime);
						} else {
							printExceptionAndStackTraceToConsole(e, `Remote revisions websocket sync with '${this.options.remoteSyncURL}' has stopped due to a fatal error`);
							throw e;
						}
					}
				}
			}

			async getLatestServerMetadata() {
				return this.operations.exec("getLatestServerMetadata", []);
			}

			////////////////////////////////////////////////////////////////////////////////////////////////
			// Local revision sync operations
			////////////////////////////////////////////////////////////////////////////////////////////////
			async pushLocalRevisions(options?: { conflictHandler?: ConflictHandler; basePath: NodePath }) {
				if (this.isClosed)
					throw new Error("Database has been closed.");

				options = ObjectTools.override({
					conflictHandler: undefined,
					basePath: []
				}, options);

				await this.resolveConflicts(options.conflictHandler, options.basePath);

				const [serializedLocalRevisions, localRevisionKeys] = await this.getSerializedLocalRevisions(Keypath.stringify(options.basePath));

				if (localRevisionKeys.length == 0)
					return;

				const responseObject = await this.syncClient.writeRaw(serializedLocalRevisions);
				const remoteCommitTimestamp = responseObject.commitTimestamp;

				if (typeof remoteCommitTimestamp !== "number")
					throw new Error("Invalid response object: 'commitTimestamp' is missing or not a number");

				await this.setAsRemotelyCommited(localRevisionKeys, remoteCommitTimestamp);
			}

			async discardLocalRevisions(basePath: NodePath = []): Promise<void> {
				if (this.isClosed)
					throw new Error("Database has been closed.");

				LocalDBOperations.validateNodePath(basePath);
				const matchingKeys = await this.getLocalRevisionKeys(Keypath.stringify(basePath));
				await this.discardLocalRevisionKeys(matchingKeys);
			}

			async discardLocalRevisionKeys(keys: string[]): Promise<void> {
				const diff = await this.operations.exec("discardLocalRevisionKeys", [keys]);
				await this.announceChanges("local", diff);
			}

			async getLocalRevisions(basePath: NodePath = []): Promise<PathEntries> {
				if (this.isClosed)
					throw new Error("Database has been closed.");

				LocalDBOperations.validateNodePath(basePath);

				const matchingEntries = await this.getLocalRevisionEntries(Keypath.stringify(basePath));
				const result: PathEntries = [];

				for (const entry of matchingEntries) {
					result.push({ path: <NodePath>Keypath.parse(entry.key), value: entry.value, metadata: entry.metadata });
				}

				return result;
			}

			async resolveConflicts(conflictHandler?: ConflictHandler, basePath: NodePath = []): Promise<void> {
				if (this.isClosed)
					throw new Error("Database has been closed.");

				const defaultConflictHandler: ConflictHandler = (conflictInfo) => {
					if (conflictInfo.localUpdateTime > conflictInfo.remoteUpdateTime)
						return Promise.resolve(conflictInfo.localValue);
					else
						return Promise.resolve(conflictInfo.remoteValue);
				}

				if (conflictHandler == null)
					conflictHandler = defaultConflictHandler;

				if (typeof conflictHandler !== "function")
					throw new TypeError("Given conflict handler is not a function");

				const conflicts = await this.getConflictingRevisions();
				const basePathString = Keypath.stringify(basePath);
				const matchingConflicts = conflicts.filter((conflictInfo) => Tools.stringStartsWith(conflictInfo.key, basePathString));

				if (matchingConflicts.length === 0)
					return;

				const resolvingEntries: EntryArray<any> = [];
				const discardedLocalRevisionKeys: string[] = [];

				for (const conflictInfo of matchingConflicts) {
					const resolvingPromise = conflictHandler(conflictInfo);

					if (!(resolvingPromise instanceof Promise)) // TODO: look for more reliable way to detect promise object
						throw new Error("A conflict handler must return a promise.");

					const resolvingValue = await resolvingPromise;

					if (!LocalDBOperations.valuesAreEqual(resolvingValue, conflictInfo.localValue)) {
						if (LocalDBOperations.valuesAreEqual(resolvingValue, conflictInfo.remoteValue)) {
							discardedLocalRevisionKeys.push(conflictInfo.key);
						} else {
							resolvingEntries.push({
								key: conflictInfo.key,
								value: resolvingValue,
								metadata: {}
							});
						}
					}
				}

				if (discardedLocalRevisionKeys.length > 0)
					await this.discardLocalRevisionKeys(discardedLocalRevisionKeys);

				if (resolvingEntries.length > 0)
					await this.commitLocalRevisions(resolvingEntries);
			}

			protected async getConflictingRevisions(): Promise<ConflictInfo[]> {
				return this.operations.exec("getConflictingRevisions", []);
			}

			protected async getSerializedLocalRevisions(basePathString: string = "") {
				return this.operations.exec("getSerializedLocalRevisions", [basePathString, this.options.encryptionKey]);
			}

			protected async getLocalRevisionEntries(basePathString: string = "") {
				return this.operations.exec("getLocalRevisions", [basePathString]);
			}

			protected async getLocalRevisionKeys(basePathString: string = "") {
				return this.operations.exec("getLocalRevisionKeys", [basePathString]);
			}

			////////////////////////////////////////////////////////////////////////////////////////////////
			// Finalization operations
			////////////////////////////////////////////////////////////////////////////////////////////////
			async destroyLocalData() {
				if (this.isClosed)
					throw new Error("Database has been closed.");

				this.isClosed = true;
				return this.operations.exec("destroyLocalData", []);
			}

			async destroyRemoteData() {
				//if (this.isClosed)
				//	throw new Error("Database has been closed.");

				return this.syncClient.destroyRemoteData();
			}

			async close() {
				this.isClosed = true;
				return this.operations.exec("close", []);
			}

			////////////////////////////////////////////////////////////////////////////////////////////////
			// Utilities
			////////////////////////////////////////////////////////////////////////////////////////////////
		}
	}

	export const open = async function(name: string, customOptions?: Partial<DB.LocalDBOptions>): Promise<DB.LocalDB> {
		const db = new DB.LocalDB(name, <DB.LocalDBOptions>customOptions);
		await db.open();

		if (customOptions && customOptions.pullAfterOpened && customOptions.remoteSyncURL)
			await db.pullRemoteRevisions();

		return db;
	}

	export const parsePath = function(path: string) {
		return Keypath.parse(path);
	}

	export const stringifyPath = function(path: DB.EntityPath) {
		return Keypath.stringify(path);
	}

	export const randKey = function(): string {
		return Crypto.Random.getAlphanumericString(16);
	}
}