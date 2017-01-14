namespace ZincDB {
	export namespace DB {
		const RemoteRevisionsStoreName = "RemoteRevisions";
		const LocalRevisionsStoreName = "LocalRevisions";
		const GlobalMetadataStoreName = "GlobalMetadata";
		const ObjectStoreNames = [GlobalMetadataStoreName, LocalRevisionsStoreName, RemoteRevisionsStoreName];

		export class LocalDBOperations {
			private db: StorageAdapter;
			protected readonly nodeLookup: NodeLookup = new NodeLookup();

			async open(name: string, options: LocalDBOptions) {
				const localDBIdentifier = `ZincDB_${name}`;

				switch (options.storageMedium) {
					case "InMemory":
						this.db = new InMemoryAdapter(localDBIdentifier);
						break;

					case "IndexedDB":
						if (!IndexedDBAdapter.isAvailable)
							throw new Error("IndexedDB is not available at the current context.");

						this.db = new IndexedDBAdapter(localDBIdentifier);
						break;

					case "WebSQL":
						if (!WebSQLAdapter.isAvailable)
							throw new Error("WebSQL is not available at the current context.");

						this.db = new WebSQLAdapter(localDBIdentifier);
						break;

					case "OnDisk":
						if (IndexedDBAdapter.isAvailable)
							this.db = new IndexedDBAdapter(localDBIdentifier);
						else if (WebSQLAdapter.isAvailable)
							this.db = new WebSQLAdapter(localDBIdentifier);
						else
							this.db = new InMemoryAdapter(localDBIdentifier);
						break;

					default:
						throw new Error("Invalid storage medium specified.")
				}

				await this.db.open();
				await this.db.createObjectStoresIfNeeded(ObjectStoreNames);
				this.nodeLookup.addPathStrings(await this.getAllKeys());
			}

			async getEntity(path: EntityPath): Promise<any> {
				if (this.isClosed)
					throw new Error("Database is closed.");

				LocalDBOperations.validateEntityPath(path);

				const matchObject = this.nodeLookup.findMatchingNodes(path);

				const stringifiedMatchPaths = Keypath.stringifyPaths(matchObject.paths);

				switch (matchObject.matchType) {
					case MatchType.None:
						return undefined;
					case MatchType.Leaf:
						const [matchingLeafEntry] = await this.getEntries(stringifiedMatchPaths)
						if (matchingLeafEntry === undefined)
							return undefined;
						else
							return matchingLeafEntry.value;
					case MatchType.Ancestor:
						const ancestorPath = matchObject.paths[0];
						const [matchingAncestorEntry] = await this.getEntries(stringifiedMatchPaths);

						if (matchingAncestorEntry === undefined)
							return undefined;

						return Keypath.getValueByKeypath(matchingAncestorEntry.value, path.slice(ancestorPath.length));
					case MatchType.Descendants:
						const descendantEntries = await this.getEntries(stringifiedMatchPaths);

						if (descendantEntries.length === 0)
							return undefined;

						return LocalDBOperations.assembleBranchObjectFromEntries(descendantEntries, path);
				}
			}

			async getEntries(keys: string[]): Promise<Entry<any>[]> {
				if (this.isClosed)
					throw new Error("Database is closed.");

				const results = await this.db.get<any>(keys, LocalRevisionsStoreName);
				const remainingKeysReversed: string[] = [];

				for (let i = results.length - 1; i >= 0; i--) {
					if (results[i] === undefined)
						remainingKeysReversed.push(keys[i]);
				}

				if (remainingKeysReversed.length === 0)
					return results;

				const matchingRemoteRevisions = await this.db.get<any>(remainingKeysReversed, RemoteRevisionsStoreName);

				for (let i = 0; i < results.length; i++) {
					if (results[i] === undefined) {
						const matchingRemoteRevision = matchingRemoteRevisions.pop();
						if (matchingRemoteRevision && matchingRemoteRevision.value !== undefined)
							results[i] = matchingRemoteRevision;
					} else {
						if (results[i].value === undefined)
							results[i] = <any>undefined;
					}
				}

				return results;
			}

			async getAllEntries(): Promise<Entry<any>[]> {
				if (this.isClosed)
					throw new Error("Database is closed.");

				const seenLocalKeys = new StringSet();
				const allEntries: Entry<any>[] = [];
				const allLocalEntries = await this.db.getAll<any>(LocalRevisionsStoreName);

				for (const entry of allLocalEntries) {
					seenLocalKeys.add(entry.key);

					if (entry.value !== undefined)
						allEntries.push(entry);
				}

				const allRemoteEntries = await this.db.getAll<any>(RemoteRevisionsStoreName);
				for (const entry of allRemoteEntries) {
					if (!seenLocalKeys.has(entry.key) && entry.value !== undefined) {
						allEntries.push(entry);
					}
				}

				allEntries.sort((entry1, entry2) => Comparers.simpleStringComparer(entry1.key, entry2.key));

				return allEntries;
			}

			async getAllKeys(): Promise<string[]> {
				if (this.isClosed)
					throw new Error("Database is closed.");

				const allLocalKeys = await this.db.getAllKeys(LocalRevisionsStoreName);
				const allKeysSet = new StringSet();

				for (const key of allLocalKeys) {
					allKeysSet.add(key);
				}

				const allRemoteKeys = await this.db.getAllKeys(RemoteRevisionsStoreName);

				for (const key of allRemoteKeys) {
					allKeysSet.add(key)
				}

				const allKeys: string[] = [];

				allKeysSet.forEach((key) => allKeys.push(key));
				allKeys.sort(Comparers.simpleStringComparer);

				return allKeys;
			}

			async getAll(): Promise<PathEntries> {
				const allEntries = await this.getAllEntries();
				return allEntries.map((entry) => { return { path: <NodePath>Keypath.parse(entry.key), value: entry.value, metadata: entry.metadata } });
			}			

			/////////////////////////////////////////////////////////////////////////////////////////////////
			/// Write operations
			/////////////////////////////////////////////////////////////////////////////////////////////////
			async commitLocalTransaction(transaction: Transaction): Promise<EntryArray<any>> {
				if (this.isClosed)
					throw new Error("Database is closed.");

				const transactionEntries: EntryArray<any> = [];
				const transactionEntriesLookup = new StringMap<Entry<any>>();
				const transactionNodeLookup = new NodeLookup();

				const appendToResult = (path: NodePath, key: string, value: any) => {
					const newEntry = { key, value, metadata: {} };
					transactionEntries.push(newEntry);
					transactionEntriesLookup.set(key, newEntry);
					transactionNodeLookup.add(path);
				}

				const processPutOrDeleteOperation = (path: NodePath, value: any) => {
					LocalDBOperations.validateNodePath(path, true);

					let matchObject = transactionNodeLookup.findMatchingNodes(path);

					if (matchObject.matchType === MatchType.None)
						matchObject = this.nodeLookup.findMatchingNodes(path);

					if (matchObject.matchType === MatchType.Ancestor ||
						matchObject.matchType === MatchType.Descendants) {
						throw new Error(`Transaction failed: the path ${Keypath.formatPath(path)} cannot be assigned as it shares hertiage with the existing leaf node ${Keypath.formatPath(matchObject.paths[0])}.`);
					}

					appendToResult(path, Keypath.stringify(path), value);
				}

				const processUpdateOperation = async (path: EntityPath, newValue: any) => {
					let matchObject: NodeLookupMatches;
					let matchingEntries: EntryArray<any>;

					const transactionMatchObject = transactionNodeLookup.findMatchingNodes(path);

					// If there is a leaf or ancestor to a node that was created or updated previously within the
					// transaction, then use it. There's no need to look up any existing values in the database.
					if (transactionMatchObject.matchType === MatchType.Leaf || transactionMatchObject.matchType === MatchType.Ancestor) {
						matchObject = transactionMatchObject;
						matchingEntries = [<Entry<any>>transactionEntriesLookup.get(Keypath.stringify(matchObject.paths[0]))];
					} else {
						matchObject = this.nodeLookup.findMatchingNodes(path);
						matchingEntries = await this.getEntries(Keypath.stringifyPaths(matchObject.paths));

						// If the transaction previously created or reassigned descendants as well,
						// add them to the match object
						if (transactionMatchObject.matchType === MatchType.Descendants) {
							// Ensure the match type to be 'Descendants' even if the database did not find
							// any results (the case where all the matching descendants were created within the transaction itself)
							matchObject.matchType = MatchType.Descendants;

							// Add the matching descendants to the match object and matching entries
							for (const descendantPath of transactionMatchObject.paths) {
								matchObject.paths.push(descendantPath);
								matchingEntries.push(<Entry<any>>transactionEntriesLookup.get(Keypath.stringify(descendantPath)));
							}
						}
					}

					if (matchObject.matchType === MatchType.None || matchingEntries.length === 0)
						throw new Error(`The path ${Keypath.formatPath(path)} did not match any existing entity in the database. To create new leaf nodes, please use 'put' instead.`);

					switch (matchObject.matchType) {
						case MatchType.Leaf:
							const matchingLeafEntry = matchingEntries[0];

							if (matchingLeafEntry === undefined || LocalDBOperations.valuesAreEqual(matchingLeafEntry, newValue))
								break;

							appendToResult(<NodePath>path, matchingLeafEntry.key, newValue);
							break;

						case MatchType.Ancestor:
							const ancestorPath = matchObject.paths[0];
							const matchingAncestorEntry = matchingEntries[0];

							if (matchingAncestorEntry === undefined)
								break;

							const entityPathRelativeToAncestor = path.slice(ancestorPath.length)

							const currentValue = Keypath.getValueByKeypath(matchingAncestorEntry.value, entityPathRelativeToAncestor);
							if (LocalDBOperations.valuesAreEqual(currentValue, newValue))
								break;

							const patchedAncestor = Keypath.patchObject(matchingAncestorEntry.value, entityPathRelativeToAncestor, newValue);
							appendToResult(ancestorPath, matchingAncestorEntry.key, patchedAncestor);

							break;

						case MatchType.Descendants:
							const descendantLeafEntries = matchingEntries;
							let newBranchObject: any;

							for (let i = 0; i < matchObject.paths.length; i++) {
								const descendantPath = matchObject.paths[i];
								const descendantPathRelativetoBranch = descendantPath.slice(path.length);
								const descendantLeafEntry = descendantLeafEntries[i];

								if (descendantLeafEntry === undefined)
									continue;

								const newLeafValue = Keypath.getValueByKeypath(newValue, descendantPathRelativetoBranch);

								newBranchObject = Keypath.patchObject(newBranchObject, descendantPathRelativetoBranch, newLeafValue);

								if (LocalDBOperations.valuesAreEqual(newLeafValue, descendantLeafEntry.value))
									continue;

								appendToResult(descendantPath, descendantLeafEntry.key, newLeafValue);
							}

							if (!ObjectTools.compareJSONObjects(newValue, newBranchObject))
								throw new Error(`Failed updating branch ${Keypath.formatPath(path)}. The supplied branch object contained a descendant object whose path could not be matched in the database. To create new leaf nodes please use 'put' instead.`);

							break;
					}
				}

				for (const operation of transaction) {
					switch (operation.type) {
						case OperationType.Put:
							processPutOrDeleteOperation(operation.path, operation.value);
							break;

						case OperationType.Delete:
							processPutOrDeleteOperation(operation.path, undefined);
							break;

						case OperationType.Update:
							await processUpdateOperation(operation.path, operation.value);
							break;

						default:
							throw new Error(`Invalid operation encountered in transaction`);
					}
				}

				return this.commitLocalRevisions(transactionEntries);
			}

			async commitLocalRevisions(newRevisions: EntryArray<any>): Promise<EntryArray<any>> {
				if (this.isClosed)
					throw new Error("Database is closed.");

				if (!Array.isArray(newRevisions))
					throw new TypeError("New revisions argument is not an array");

				if (newRevisions.length === 0)
					return [];

				const entryKeys = newRevisions.map((entry) => entry.key);

				const [existingRevisions, latestServerMetadata] = await Promise.all([
					this.db.get<any>(entryKeys, LocalRevisionsStoreName),
					this.getLatestServerMetadata()])

				const commitObject: EntryObject<any> = {};
				const diff: EntryArray<any> = [];
				const timestamp = Timer.getMicrosecondTimestamp();

				for (let i = 0; i < entryKeys.length; i++) {
					const newRevision = newRevisions[i];
					const existingRevision = existingRevisions[i];

					if (existingRevision && LocalDBOperations.valuesAreEqual(newRevision.value, existingRevision.value))
						continue;

					if (!newRevision.metadata)
						newRevision.metadata = {};

					if (existingRevision && existingRevision.metadata && existingRevision.metadata.referenceSyncTimestamp > 0) {
						newRevision.metadata.referenceSyncTimestamp = existingRevision.metadata.referenceSyncTimestamp;
					} else {
						newRevision.metadata.referenceSyncTimestamp = latestServerMetadata.lastModified;
					}

					newRevision.metadata.updateTime = timestamp;

					commitObject[newRevision.key] = newRevision;
					diff.push(newRevision);
				}

				if (diff.length === 0)
					return [];

				await this.db.set({
					[LocalRevisionsStoreName]: commitObject,
				});

				this.nodeLookup.addPathStrings(diff.map((entry) => entry.key));
				return diff;
			}

			async commitSerializedRemoteRevisions(serializedRevisions: Uint8Array, decryptionKeyHex?: string): Promise<EntryArray<any>> {
				if (!(serializedRevisions instanceof Uint8Array))
					throw new TypeError("The given argument is not a Uint8Array");

				const deserializedRevisions = EntrySerializer.compactAndDeserializeEntries(serializedRevisions, decryptionKeyHex);
				return this.commitRemoteRevisions(deserializedRevisions);
			}

			async commitRemoteRevisions(newRevisions: Entry<any>[]): Promise<EntryArray<any>> {
				if (this.isClosed)
					throw new Error("Database is closed.");

				if (!Array.isArray(newRevisions))
					throw new TypeError("New revisions argument is not an array");
				
				if (newRevisions.length === 0)
					return [];

				const keys: string[] = newRevisions.map((entry) => entry.key);
				let [existingRemoteRevisions, matchingLocalRevisionsExist, serverMetadata] = await Promise.all([
					this.db.get<any>(keys, RemoteRevisionsStoreName),
					this.db.has(keys, LocalRevisionsStoreName),
					this.getLatestServerMetadata()
				]);

				let commitObject: EntryObject<any> = {};
				let diff: Entry<any>[] = [];
				const transactionNodeLookup = new NodeLookup();

				for (let i = 0; i < newRevisions.length; i++) {
					const newRevision = newRevisions[i];
					const existingRevision = existingRemoteRevisions[i];

					if (!newRevision.metadata)
						throw new Error("Encountered a remote revision with no metadata");

					if (!newRevision.metadata.commitTime)
						throw new Error("Encountered a remote revision with no commit timestamp");

					// If a creation event event entry is encountered and the datastore has already been synced before, 
					// clear all entries in the datastore, and discard all previous updates that were timed before 
					// the creation event entry. Otherwise skip.
					if (newRevision.metadata.isCreationEvent) {
						if (serverMetadata.lastModified > 0) {
							// Clear all new revisions that were added to the update objects 
							commitObject = {};

							// Set the diff to include all known remote revisions keys to value `undefined`
							// With the creation event commit timestamp as timestamp
							const creationTime = newRevision.metadata.commitTime;
							diff = (await this.getRemoteRevisionKeys())
								.map((key) => ({ key, value: undefined, metadata: { updateTime: creationTime, commitTime: creationTime} }))

							// Clear all remote entries from the database
							await this.db.clearObjectStores([RemoteRevisionsStoreName]);

							// Regenerate node lookup to only include the local revisions' keys
							this.nodeLookup.clear();
							await this.nodeLookup.addPathStrings(await this.getLocalRevisionKeys());

							// Set all previously matching remote revisions to undefined
							existingRemoteRevisions = existingRemoteRevisions.map(() => <Entry<any>><any>undefined);
						}

						continue;
					}

					// Check if the remote revision received was due to a previous local change
					// that has been transmitted to the server and marked as commited locally, or alternatively
					// It has a value equal to the current value.
					// At these cases, there is no need to commit it again or include it in the returned revision list.
					if (existingRevision &&
						(existingRevision.metadata.commitTime === newRevision.metadata.commitTime ||
							LocalDBOperations.valuesAreEqual(existingRevision.value, newRevision.value))) {
						continue;
					}

					// Check it the given leaf path is invalid or shares heritage with an existing leaf path.
					// This includes local revision that haven't been transmitted yet. 
					let revisionPath: NodePath;

					try {
						revisionPath = <NodePath>Keypath.parse(newRevision.key);
						LocalDBOperations.validateNodePath(revisionPath, true)
					} catch (e) {
						log(`commitRemoteRevisions: Ignored a remote revision with a key that failed to parse as a leaf node path: '${newRevision.key}'`);
						continue;
					}

					// Check if the path conflicts with an existing leaf path
					const matchingDatabaseNodes = this.nodeLookup.findMatchingNodes(revisionPath);
					const matchingTransactionNodes = transactionNodeLookup.findMatchingNodes(revisionPath);
					if (matchingDatabaseNodes.matchType === MatchType.Ancestor ||
						matchingDatabaseNodes.matchType === MatchType.Descendants ||
						matchingTransactionNodes.matchType === MatchType.Ancestor ||
						matchingTransactionNodes.matchType === MatchType.Descendants) {
						log(`commitRemoteRevisions: Ignored a remote revision with path ${Keypath.formatPath(revisionPath)} that shares heritage with an existing leaf node: '${Keypath.formatPath(matchingDatabaseNodes.paths[0] || matchingTransactionNodes.paths[0])}}'`);
						continue;
					}

					commitObject[newRevision.key] = newRevision;

					// Add to the diff if the key is not shadowed by an existing local revision
					if (!matchingLocalRevisionsExist[i])
						diff.push(newRevision);

					// Add to the lookup tree for the transaction
					transactionNodeLookup.add(revisionPath);
				}

				const latestCommitTimestamp = newRevisions[newRevisions.length - 1].metadata.commitTime;
				serverMetadata.lastModified = <number>latestCommitTimestamp;

				await this.db.set({
					[RemoteRevisionsStoreName]: commitObject,
					[GlobalMetadataStoreName]: { "serverMetadata": { key: "serverMetadata", value: serverMetadata, metadata: {} } },
				});

				// Add add paths as leaf nodes, if needed. 
				this.nodeLookup.addPathStrings(diff.map((entry) => entry.key));

				return diff;
			}

			async setAsRemotelyCommited(keys: string[], commitTimestamp: number): Promise<void> {
				if (this.isClosed)
					throw new Error("Database is closed.");

				if (keys.length === 0)
					return;

				const existingLocalRevisions = await this.db.get<any>(keys, LocalRevisionsStoreName);

				const entriesObject: EntryObject<any> = {};
				const clearingObject: { [key: string]: null } = {};

				for (let i = 0; i < keys.length; i++) {
					const localRevision = existingLocalRevisions[i];

					if (localRevision === undefined)
						continue;

					localRevision.metadata.commitTime = commitTimestamp;
					localRevision.metadata.referenceSyncTimestamp = undefined;
					entriesObject[localRevision.key] = localRevision;

					clearingObject[keys[i]] = null;
				}

				await this.db.set({
					[RemoteRevisionsStoreName]: entriesObject,
					[LocalRevisionsStoreName]: clearingObject,
				});
			}

			async getRemoteRevisionKeys(keyPrefix?: string): Promise<string[]> {
				if (this.isClosed)
					throw new Error("Database is closed.");

				const remoteRevisionKeys = await this.db.getAllKeys(RemoteRevisionsStoreName);

				if (keyPrefix)
					return remoteRevisionKeys.filter((key) => Tools.stringStartsWith(key, keyPrefix));
				else
					return remoteRevisionKeys;
			}

			/////////////////////////////////////////////////////////////////////////////////////////////////
			/// Sync related operations
			/////////////////////////////////////////////////////////////////////////////////////////////////
			async getSerializedLocalRevisions(keyPrefix?: string, encryptionKeyHex?: string): Promise<[Uint8Array, string[]]> {
				if (this.isClosed)
					throw new Error("Database is closed.");

				const localRevisions = await this.getLocalRevisions(keyPrefix);
				const localRevisionKeys = localRevisions.map((entry) => entry.key);
				return [EntrySerializer.serializeEntries(localRevisions, encryptionKeyHex), localRevisionKeys];
			}

			async getLocalRevisions(keyPrefix?: string): Promise<EntryArray<any>> {
				if (this.isClosed)
					throw new Error("Database is closed.");

				const localRevisions = await this.db.getAll<any>(LocalRevisionsStoreName);

				if (keyPrefix)
					return localRevisions.filter((entry) => Tools.stringStartsWith(entry.key, keyPrefix));
				else
					return localRevisions;
			}

			async getLocalRevisionKeys(keyPrefix?: string): Promise<string[]> {
				if (this.isClosed)
					throw new Error("Database is closed.");

				const localRevisionKeys = await this.db.getAllKeys(LocalRevisionsStoreName);

				if (keyPrefix)
					return localRevisionKeys.filter((key) => Tools.stringStartsWith(key, keyPrefix));
				else
					return localRevisionKeys;
			}

			async discardLocalRevisionKeys(keys: string[]): Promise<EntryArray<any>> {
				if (this.isClosed)
					throw new Error("Database is closed.");

				const [matchingLocalRevisions, matchingRemoteRevisions] = await Promise.all([
					this.db.get(keys, LocalRevisionsStoreName),
					this.db.get(keys, RemoteRevisionsStoreName),
				]);

				const clearingObject: { [key: string]: null } = {};
				const resultingDiff: EntryArray<any> = [];
				const purgedKeys: string[] = [];
				const timestamp = Timer.getMicrosecondTimestamp();

				for (let i = 0; i < keys.length; i++) {
					const key = keys[i];
					const matchingLocalRevision = matchingLocalRevisions[i];
					const matchingRemoteRevision = matchingRemoteRevisions[i];

					if (matchingLocalRevision !== undefined) {
						if (matchingRemoteRevision !== undefined) {
							if (!LocalDBOperations.valuesAreEqual(matchingLocalRevision.value, matchingRemoteRevision.value)) {
								resultingDiff.push(matchingRemoteRevision);
							}
						} else {
							resultingDiff.push({ key, value: undefined, metadata: { updateTime: timestamp } });
							purgedKeys.push(key);
						}

						clearingObject[keys[i]] = null;
					}
				}

				await this.db.set({
					[LocalRevisionsStoreName]: clearingObject
				});

				// Remove purged keys from the node lookup tree
				for (const key of purgedKeys) {
					this.nodeLookup.delete(Keypath.parse(key));
				}

				return resultingDiff;
			}

			async getLocalRevisionCount(): Promise<number> {
				if (this.isClosed)
					throw new Error("Database is closed.");

				return await this.db.count({}, LocalRevisionsStoreName);
			}

			async getConflictingRevisions(): Promise<ConflictInfo[]> {
				if (this.isClosed)
					throw new Error("Database is closed.");

				const localRevisions = await this.getLocalRevisions();
				const localRevisionsKeys = localRevisions.map((entry) => entry.key);

				const matchingRemoteEntries = await this.db.get<any>(localRevisionsKeys, RemoteRevisionsStoreName);
				const conflicts: ConflictInfo[] = [];

				for (let i = 0; i < localRevisionsKeys.length; i++) {
					const localRevision = localRevisions[i];
					const remoteRevision = matchingRemoteEntries[i];

					if (!remoteRevision ||
						localRevision.metadata.referenceSyncTimestamp > remoteRevision.metadata.commitTime ||
						LocalDBOperations.valuesAreEqual(localRevision.value, remoteRevision.value)) {
						continue;
					}

					conflicts.push({
						key: localRevision.key,
						path: <NodePath>Keypath.parse(localRevision.key),
						localValue: localRevision.value,
						remoteValue: remoteRevision.value,
						localUpdateTime: <number>localRevision.metadata.updateTime,
						remoteUpdateTime: <number>remoteRevision.metadata.updateTime,
						remoteCommitTime: <number>remoteRevision.metadata.commitTime
					});
				}

				return conflicts;
			}

			async getLatestServerMetadata(): Promise<ServerMetadata> {
				if (this.isClosed)
					throw new Error("Database is closed.");

				const serverMetadataEntry = await this.db.get<ServerMetadata>("serverMetadata", GlobalMetadataStoreName)

				if (serverMetadataEntry === undefined)
					return { lastModified: 0, lastRewritten: 0 };
				else
					return serverMetadataEntry.value;
			}

			/////////////////////////////////////////////////////////////////////////////////////////////////
			/// Iteration operations
			/////////////////////////////////////////////////////////////////////////////////////////////////
			async foreach(foreachFunc: (value: any, key: string, updateTime: number) => void): Promise<void> {
				if (this.isClosed)
					throw new Error("Database is closed.");

				if (typeof foreachFunc !== "function")
					throw new TypeError("Missing or invalid callback function received");

				const keysSeenInLocalRevisions = new StringSet();
				await this.db.createIterator(LocalRevisionsStoreName, undefined, {
					transactionMode: "readonly"
				}, (entry, transaction, moveNext) => {
					if (entry.value !== undefined)
						foreachFunc(entry.value, entry.key, <number>entry.metadata.updateTime);

					keysSeenInLocalRevisions.add(entry.key);
					moveNext();
				})

				await this.db.createIterator(RemoteRevisionsStoreName, undefined, {
					transactionMode: "readonly"
				}, (entry, transaction, moveNext) => {
					if (entry.value !== undefined && !keysSeenInLocalRevisions.has(entry.key))
						foreachFunc(entry.value, entry.key, <number>entry.metadata.updateTime);

					moveNext();
				})
			}

			/////////////////////////////////////////////////////////////////////////////////////////////////
			/// Finalization operations
			/////////////////////////////////////////////////////////////////////////////////////////////////			
			async destroyLocalData() {
				if (this.isClosed)
					throw new Error("Database is closed.");

				await this.db.destroy();
				await this.close();
			}

			async close() {
				await this.db.close();
				this.db = <any>undefined;
				this.nodeLookup.clear();
			}

			/////////////////////////////////////////////////////////////////////////////////////////////////
			/// Misc operations
			/////////////////////////////////////////////////////////////////////////////////////////////////
			/*
			async deserializeEntries(serializedEntries: Uint8Array, decryptionKeyHex?: string) {
				return EntrySerializer.deserializeEntries(serializedEntries, decryptionKeyHex)
			}

			async compactAndDeserializeEntries(serializedEntries: Uint8Array, decryptionKeyHex?: string) {
				return EntrySerializer.compactAndDeserializeEntries(serializedEntries, decryptionKeyHex)
			}

			async serializeEntries(entries: EntryArray<any>, encryptionKeyHex?: string) {
				return EntrySerializer.serializeEntries(entries, encryptionKeyHex)
			}
			*/

			get isClosed(): boolean {
				return this.db === undefined;
			}

			////////////////////////////////////////////////////////////////////////////////////////////////
			// Static utilities
			////////////////////////////////////////////////////////////////////////////////////////////////
			static transactionElementsToEntryArray(transactionElements: PathEntries): EntryArray<any> {
				const revisionEntries: EntryArray<any> = [];

				for (const transactionEntry of transactionElements)
					revisionEntries.push({ key: Keypath.stringify(transactionEntry.path), value: transactionEntry.value, metadata: transactionEntry.metadata || {} });

				return revisionEntries;
			}

			static validateNodePath(path: NodePath, errorOnRoot = false) {
				if (path == null)
					throw new TypeError(`Null or undefined path given`);

				if (!Array.isArray(path))
					throw new TypeError(`The path argument given is not an array`);

				for (const specifier of path) {
					if (typeof specifier !== "string")
						throw new TypeError(`The path ${Keypath.formatPath(path)} contains an non-string specifier`);
				}

				if (errorOnRoot && path.length === 0)
					throw new TypeError(`The root cannot be used as a target for this operation`)
			}

			static validateEntityPath(path: EntityPath) {
				if (path == null)
					throw new TypeError(`Null or undefined path given`);

				if (!Array.isArray(path))
					throw new TypeError(`The path argument given is not an array`);

				for (const specifier of path) {
					const specifierType = typeof specifier;

					if (specifierType !== "string" && specifierType !== "number")
						throw new TypeError(`The path ${Keypath.formatPath(path)} contains a specifier with type other than string or number`);
				}
			}

			static cloneEntry(value: any): any {
				return ObjectTools.deepCloneJSONValue(value);
			}

			static valuesAreEqual(value1: any, value2: any): boolean {
				if (value1 instanceof Uint8Array) {
					if (!(value2 instanceof Uint8Array))
						return false;

					return ArrayTools.arraysAreEqual(value1, value2);
				}

				return ObjectTools.compareJSONObjects(value1, value2, 0, 1000)
			}

			static entryArrayToValueObject<V>(entryArray: EntryArray<V>, cloneValues = true): ValueObject<V> {
				const result: ValueObject<V> = {};

				for (const entry of entryArray) {
					if (entry.metadata && entry.metadata.isCreationEvent) {
						continue;
					}

					let value: V;

					if (cloneValues)
						value = this.cloneEntry(entry.value);
					else
						value = entry.value

					result[entry.key] = value;
				}

				return result;
			}

			static compactEntries(entries: EntryArray<any>) {
				const compactedEntries = entries.slice(0);
				const seenKeys = new StringSet();

				for (let i = entries.length - 1; i >= 0; i--) {
					const key = entries[i].key;

					if (seenKeys.has(key))
						compactedEntries[i] = <any>undefined;
					else
						seenKeys.add(entries[i].key);
				}

				return compactedEntries.filter((entry) => entry !== undefined);
			}

			static assembleBranchObjectFromEntries(entries: EntryArray<any>, branchBasePath: EntityPath = []) {
				if (branchBasePath.length > 0) {
					const branchPathOffset = Keypath.stringify(branchBasePath).length;

					return Keypath.unflattenObjectTree(entries.map((entry) => {
						return { path: Keypath.parse(entry.key.substr(branchPathOffset)), value: entry.value }
					}));
				} else {
					return Keypath.unflattenObjectTree(entries.map((entry) => {
						return { path: Keypath.parse(entry.key), value: entry.value }
					}));
				}
			}

			static formatValue(val: any) {
				if (val === undefined)
					return "";
				else if (val instanceof Uint8Array)
					return Encoding.Base64.encode(val);
				else
					return JSON.stringify(val);
			}
		}

		export type LocalDBOperationsSchema = {
			open: { Args: [string, LocalDBOptions]; ReturnValue: void };
			commitLocalTransaction: { Args: [Transaction]; ReturnValue: EntryArray<any> };
			commitLocalRevisions: { Args: [EntryArray<any>]; ReturnValue: EntryArray<any> };
			commitSerializedRemoteRevisions: { Args: [Uint8Array, string | undefined]; ReturnValue: EntryArray<any> };
			setAsRemotelyCommited: { Args: [string[], number]; ReturnValue: void };
			getEntity: { Args: [EntityPath]; ReturnValue: any };
			getAllEntries: { Args: undefined[]; ReturnValue: EntryArray<any> };
			getAllKeys: { Args: undefined[]; ReturnValue: string[] };
			getAll: { Args: undefined[]; ReturnValue: PathEntries };
			getLatestServerMetadata: { Args: undefined[]; ReturnValue: ServerMetadata };
			discardLocalRevisionKeys: { Args: [string[]]; ReturnValue: EntryArray<any> };
			getConflictingRevisions: { Args: undefined[]; ReturnValue: ConflictInfo[] };
			getSerializedLocalRevisions: { Args: [string, string | undefined]; ReturnValue: [Uint8Array, string[]] };
			getLocalRevisions: { Args: [string]; ReturnValue: EntryArray<any> };
			getLocalRevisionKeys: { Args: [string]; ReturnValue: string[] };
			destroyLocalData: { Args: undefined[]; ReturnValue: void };
			close: { Args: undefined[]; ReturnValue: void };
		}

		type Extends<A extends B, B> = boolean;
		export type LocalDBOperationsSchemaExtendsDispatcherSchema = Extends<LocalDBOperationsSchema, DispatcherSchema>;
		export type LocalDBOperationsSchemaKeysAreValid = Extends<keyof LocalDBOperationsSchema, keyof LocalDBOperations>;
	}
}