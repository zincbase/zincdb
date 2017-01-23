namespace ZincDB {
	export namespace DB {
		const RemoteEntriesStoreName = "RemoteEntries";
		const LocalEntriesStoreName = "LocalEntries";
		const GlobalMetadataStoreName = "GlobalMetadata";
		const ObjectStoreNames = [GlobalMetadataStoreName, LocalEntriesStoreName, RemoteEntriesStoreName];

		export class LocalDBOperations {
			private db: StorageAdapter;
			private currentOpenOptions?: LocalDBOptions;

			protected readonly nodeLookup: NodeLookup = new NodeLookup();

			//////////////////////////////////////////////////////////////////////////////////////
			// Initialization operations
			//////////////////////////////////////////////////////////////////////////////////////			
			async open(name: string, options: LocalDBOptions) {
				if (this.db !== undefined) {
					if (ObjectTools.deepCompare(options, this.currentOpenOptions) === true)
						return;
					else
						throw new Error(`Database '${name}' is already open with conflicting initialization options`);
				}

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

					case "SQLite":
						if (!NodeSQLiteAdapter.isAvailable)
							throw new Error("SQLite is not available at the current context.");

						this.db = new NodeSQLiteAdapter(localDBIdentifier, options.storagePath || "");
						break;

					case "LevelDB":
						if (!LevelUpAdapter.isAvailable)
							throw new Error("LevelDB is not available at the current context.");

						this.db = new LevelUpAdapter(localDBIdentifier, options.storagePath || "");
						break;

					case "LocalStorage":
						if (!WebStorageAdapter.isAvailable)
							throw new Error("LocalStorage is not available at the current context.");

						this.db = new WebStorageAdapter(localDBIdentifier, "LocalStorage");
						break;

					case "SessionStorage":
						if (!WebStorageAdapter.isAvailable)
							throw new Error("SessionStorage is not available at the current context.");

						this.db = new WebStorageAdapter(localDBIdentifier, "SessionStorage");
						break;

					case "OnDisk":
						if (LevelUpAdapter.isAvailable)
							this.db = new LevelUpAdapter(localDBIdentifier, options.storagePath || "");
						else if (IndexedDBAdapter.isAvailable)
							this.db = new IndexedDBAdapter(localDBIdentifier);
						else if (NodeSQLiteAdapter.isAvailable)
							this.db = new NodeSQLiteAdapter(localDBIdentifier, options.storagePath || "");
						else if (WebSQLAdapter.isAvailable)
							this.db = new WebSQLAdapter(localDBIdentifier);
						else if (WebStorageAdapter.isAvailable)
							this.db = new WebStorageAdapter(localDBIdentifier, "LocalStorage");			
						else
							this.db = new InMemoryAdapter(localDBIdentifier);
						break;

					default:
						throw new Error("Invalid storage medium specified.")
				}

				try {
					await this.db.open();
					await this.db.createObjectStoresIfNeeded(ObjectStoreNames);
					this.nodeLookup.addPathStrings(await this.getAllKeys());
				} catch (err) {
					this.close();
					throw err;
				}

				this.currentOpenOptions = options;
			}

			//////////////////////////////////////////////////////////////////////////////////////
			// Read operations
			//////////////////////////////////////////////////////////////////////////////////////
			async getEntity(path: EntityPath): Promise<any> {
				if (this.isClosed)
					throw new Error("Database is closed.");

				LocalDBOperations.verifyAndNormalizeEntityPath(path);

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

				const results = await this.db.get<any>(keys, LocalEntriesStoreName);
				const remainingKeysReversed: string[] = [];

				for (let i = results.length - 1; i >= 0; i--) {
					if (results[i] === undefined)
						remainingKeysReversed.push(keys[i]);
				}

				if (remainingKeysReversed.length === 0)
					return results;

				const matchingRemoteEntries = await this.db.get<any>(remainingKeysReversed, RemoteEntriesStoreName);

				for (let i = 0; i < results.length; i++) {
					if (results[i] === undefined) {
						const matchingRemoteEntry = matchingRemoteEntries.pop();
						if (matchingRemoteEntry && matchingRemoteEntry.value !== undefined)
							results[i] = matchingRemoteEntry;
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
				const allLocalEntries = await this.db.getAll<any>(LocalEntriesStoreName);

				for (const entry of allLocalEntries) {
					seenLocalKeys.add(entry.key);

					if (entry.value !== undefined)
						allEntries.push(entry);
				}

				const allRemoteEntries = await this.db.getAll<any>(RemoteEntriesStoreName);
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

				const allLocalKeys = await this.db.getAllKeys(LocalEntriesStoreName);
				const allKeysSet = new StringSet();

				for (const key of allLocalKeys) {
					allKeysSet.add(key);
				}

				const allRemoteKeys = await this.db.getAllKeys(RemoteEntriesStoreName);

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

			async hasEntity(path: EntityPath): Promise<boolean> {
				return (await this.getEntity(path)) !== undefined;
			}

			/////////////////////////////////////////////////////////////////////////////////////////////////
			/// Write operations
			/////////////////////////////////////////////////////////////////////////////////////////////////
			async commitLocalTransaction(transaction: Batch): Promise<EntryArray<any>> {
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

				const processPutOperation = (path: NodePath, value: any) => {
					LocalDBOperations.verifyAndNormalizeNodePath(path, true);

					let matchObject = transactionNodeLookup.findMatchingNodes(path);

					if (matchObject.matchType === MatchType.None)
						matchObject = this.nodeLookup.findMatchingNodes(path);

					if (matchObject.matchType === MatchType.Ancestor ||
						matchObject.matchType === MatchType.Descendants) {
						throw new Error(`Transaction failed: the path ${Keypath.formatPath(path)} cannot be assigned as it shares hertiage with the existing leaf node ${Keypath.formatPath(matchObject.paths[0])}.`);
					}

					appendToResult(path, Keypath.stringify(path), value);
				}

				const processUpdateOrDeleteOperation = async (path: EntityPath, newValue: any, operationType: OperationType) => {
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

					if (matchObject.matchType === MatchType.None || matchingEntries.length === 0) {
						if (operationType === OperationType.Update)
							throw new Error(`The path ${Keypath.formatPath(path)} did not match any existing entity in the database. To create new leaf nodes, please use 'put' instead.`);
						else
							return;
					}

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

							if (newValue !== undefined && !ObjectTools.deepCompare(newValue, newBranchObject))
								throw new Error(`Failed updating branch ${Keypath.formatPath(path)}. The supplied object contained a descendant object whose path could not be matched in the database. To create new leaf nodes please use 'put' instead.`);

							break;
					}
				}

				for (const operation of transaction) {
					switch (operation.type) {
						case OperationType.Put:
							processPutOperation(operation.path, operation.value);
							break;

						case OperationType.Update:
							await processUpdateOrDeleteOperation(operation.path, operation.value, OperationType.Update);
							break;

						case OperationType.Delete:
							await processUpdateOrDeleteOperation(operation.path, undefined, OperationType.Delete);
							break;

						default:
							throw new Error(`Invalid operation encountered in transaction`);
					}
				}

				return this.commitLocalEntries(transactionEntries);
			}

			async commitLocalEntries(newEntries: EntryArray<any>): Promise<EntryArray<any>> {
				if (this.isClosed)
					throw new Error("Database is closed.");

				if (!Array.isArray(newEntries))
					throw new TypeError("Entries argument must be an array");

				if (newEntries.length === 0)
					return [];

				const entryKeys = newEntries.map((entry) => entry.key);

				const [existingEntries, latestServerMetadata] = await Promise.all([
					this.db.get<any>(entryKeys, LocalEntriesStoreName),
					this.getLatestServerMetadata()])

				const commitObject: EntryObject<any> = {};
				const diff: EntryArray<any> = [];
				const timestamp = Timer.getMicrosecondTimestamp();

				for (let i = 0; i < entryKeys.length; i++) {
					const newEntry = newEntries[i];
					const existingEntry = existingEntries[i];

					if (existingEntry && LocalDBOperations.valuesAreEqual(newEntry.value, existingEntry.value))
						continue;

					if (!newEntry.metadata)
						newEntry.metadata = {};

					if (existingEntry && existingEntry.metadata && existingEntry.metadata.syncReferenceTime! > 0) {
						newEntry.metadata.syncReferenceTime = existingEntry.metadata.syncReferenceTime;
					} else {
						newEntry.metadata.syncReferenceTime = latestServerMetadata.lastModified;
					}

					newEntry.metadata.updateTime = timestamp;

					commitObject[newEntry.key] = newEntry;
					diff.push(newEntry);
				}

				if (diff.length === 0)
					return [];

				await this.db.set({
					[LocalEntriesStoreName]: commitObject,
				});

				this.nodeLookup.addPathStrings(diff.map((entry) => entry.key));
				return diff;
			}

			async commitSerializedRemoteEntries(serializedEntries: Uint8Array, decryptionKeyHex?: string): Promise<EntryArray<any>> {
				if (!(serializedEntries instanceof Uint8Array))
					throw new TypeError("The given argument is not a Uint8Array");

				const deserializedEntries = EntrySerializer.compactAndDeserializeEntries(serializedEntries, decryptionKeyHex);
				return this.commitRemoteEntries(deserializedEntries);
			}

			async commitRemoteEntries(newEntries: Entry<any>[]): Promise<EntryArray<any>> {
				if (this.isClosed)
					throw new Error("Database is closed.");

				if (!Array.isArray(newEntries))
					throw new TypeError("Entries argument must be an array");

				if (newEntries.length === 0)
					return [];

				const keys: string[] = newEntries.map((entry) => entry.key);
				let [existingRemoteEntries, matchingLocalEntriesExist, serverMetadata] = await Promise.all([
					this.db.get<any>(keys, RemoteEntriesStoreName),
					this.db.has(keys, LocalEntriesStoreName),
					this.getLatestServerMetadata()
				]);

				let commitObject: EntryObject<any> = {};
				let diff: Entry<any>[] = [];
				const transactionNodeLookup = new NodeLookup();

				for (let i = 0; i < newEntries.length; i++) {
					const newEntry = newEntries[i];
					const existingEntry = existingRemoteEntries[i];

					if (!newEntry.metadata)
						throw new Error("Encountered a remote entry with no metadata");

					if (!newEntry.metadata.commitTime)
						throw new Error("Encountered a remote entry with no commit timestamp");

					// If a creation event event entry is encountered and the datastore has already been synced before, 
					// clear all entries in the datastore, and discard all previous updates that were timed before 
					// the creation event entry. Otherwise skip.
					if (newEntry.metadata.isCreationEvent) {
						if (serverMetadata.lastModified > 0) {
							// Clear all new entries that were added to the update objects 
							commitObject = {};

							// Set the diff to include all known remote entry keys to value `undefined`
							// With the creation event commit timestamp as timestamp
							const creationTime = newEntry.metadata.commitTime;
							diff = (await this.getRemoteEntryKeys())
								.map((key) => ({ key, value: undefined, metadata: { updateTime: creationTime, commitTime: creationTime } }))

							// Clear all remote entries from the database
							await this.db.clearObjectStores([RemoteEntriesStoreName]);

							// Regenerate node lookup to only include the local entries' keys
							this.nodeLookup.clear();
							await this.nodeLookup.addPathStrings(await this.getLocalEntryKeys());

							// Set all previously matching remote entries to undefined
							existingRemoteEntries = existingRemoteEntries.map(() => <Entry<any>><any>undefined);
						}

						continue;
					}

					// Check if the remote entry received was due to a previous local change
					// that has been transmitted to the server and marked as commited locally, or alternatively
					// It has a value equal to the current value.
					// At these cases, there is no need to commit it again or include it in the returned changes list.
					if (existingEntry &&
						(existingEntry.metadata.commitTime === newEntry.metadata.commitTime ||
							LocalDBOperations.valuesAreEqual(existingEntry.value, newEntry.value))) {
						continue;
					}

					// Check it the given leaf path is invalid or shares heritage with an existing leaf path.
					// This includes local entries that haven't been transmitted yet. 
					let entryPath: NodePath;

					try {
						entryPath = <NodePath>Keypath.parse(newEntry.key);
						LocalDBOperations.verifyAndNormalizeNodePath(entryPath, true)
					} catch (e) {
						log(`commitRemoteEntries: Ignored a remote entry with a key that failed to parse as a leaf node path: '${newEntry.key}'`);
						continue;
					}

					// Check if the path conflicts with an existing leaf path
					const matchingDatabaseNodes = this.nodeLookup.findMatchingNodes(entryPath);
					const matchingTransactionNodes = transactionNodeLookup.findMatchingNodes(entryPath);
					if (matchingDatabaseNodes.matchType === MatchType.Ancestor ||
						matchingDatabaseNodes.matchType === MatchType.Descendants ||
						matchingTransactionNodes.matchType === MatchType.Ancestor ||
						matchingTransactionNodes.matchType === MatchType.Descendants) {
						log(`commitRemoteEntries: Ignored a remote entry with path ${Keypath.formatPath(entryPath)} that shares heritage with an existing leaf node: '${Keypath.formatPath(matchingDatabaseNodes.paths[0] || matchingTransactionNodes.paths[0])}}'`);
						continue;
					}

					commitObject[newEntry.key] = newEntry;

					// Add to the diff if the key is not shadowed by an existing local entry
					if (!matchingLocalEntriesExist[i])
						diff.push(newEntry);

					// Add to the lookup tree for the transaction
					transactionNodeLookup.add(entryPath);
				}

				const latestCommitTimestamp = newEntries[newEntries.length - 1].metadata.commitTime;
				serverMetadata.lastModified = <number>latestCommitTimestamp;

				await this.db.set({
					[RemoteEntriesStoreName]: commitObject,
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

				const existingLocalEntries = await this.db.get<any>(keys, LocalEntriesStoreName);

				const entriesObject: EntryObject<any> = {};
				const clearingObject: { [key: string]: null } = {};

				for (let i = 0; i < keys.length; i++) {
					const localEntry = existingLocalEntries[i];

					if (localEntry === undefined)
						continue;

					localEntry.metadata.commitTime = commitTimestamp;
					localEntry.metadata.syncReferenceTime = undefined;
					entriesObject[localEntry.key] = localEntry;

					clearingObject[keys[i]] = null;
				}

				await this.db.set({
					[RemoteEntriesStoreName]: entriesObject,
					[LocalEntriesStoreName]: clearingObject,
				});
			}

			async getRemoteEntryKeys(keyPrefix?: string): Promise<string[]> {
				if (this.isClosed)
					throw new Error("Database is closed.");

				const remoteEntryKeys = await this.db.getAllKeys(RemoteEntriesStoreName);

				if (keyPrefix)
					return remoteEntryKeys.filter((key) => Tools.stringStartsWith(key, keyPrefix));
				else
					return remoteEntryKeys;
			}

			/////////////////////////////////////////////////////////////////////////////////////////////////
			/// Sync related operations
			/////////////////////////////////////////////////////////////////////////////////////////////////
			async getSerializedLocalEntries(keyPrefix?: string, encryptionKeyHex?: string): Promise<[Uint8Array, string[]]> {
				if (this.isClosed)
					throw new Error("Database is closed.");

				const localEntries = await this.getLocalEntries(keyPrefix);
				const localEntryKeys = localEntries.map((entry) => entry.key);
				return [EntrySerializer.serializeEntries(localEntries, encryptionKeyHex), localEntryKeys];
			}

			async getLocalEntries(keyPrefix?: string): Promise<EntryArray<any>> {
				if (this.isClosed)
					throw new Error("Database is closed.");

				const localEntries = await this.db.getAll<any>(LocalEntriesStoreName);

				if (keyPrefix)
					return localEntries.filter((entry) => Tools.stringStartsWith(entry.key, keyPrefix));
				else
					return localEntries;
			}

			async getLocalEntryKeys(keyPrefix?: string): Promise<string[]> {
				if (this.isClosed)
					throw new Error("Database is closed.");

				const localEntryKeys = await this.db.getAllKeys(LocalEntriesStoreName);

				if (keyPrefix)
					return localEntryKeys.filter((key) => Tools.stringStartsWith(key, keyPrefix));
				else
					return localEntryKeys;
			}

			async discardLocalEntryKeys(keys: string[]): Promise<EntryArray<any>> {
				if (this.isClosed)
					throw new Error("Database is closed.");

				const [matchingLocalEntries, matchingRemoteEntries] = await Promise.all([
					this.db.get(keys, LocalEntriesStoreName),
					this.db.get(keys, RemoteEntriesStoreName),
				]);

				const clearingObject: { [key: string]: null } = {};
				const resultingDiff: EntryArray<any> = [];
				const purgedKeys: string[] = [];
				const timestamp = Timer.getMicrosecondTimestamp();

				for (let i = 0; i < keys.length; i++) {
					const key = keys[i];
					const matchingLocalEntry = matchingLocalEntries[i];
					const matchingRemoteEntry = matchingRemoteEntries[i];

					if (matchingLocalEntry !== undefined) {
						if (matchingRemoteEntry !== undefined) {
							if (!LocalDBOperations.valuesAreEqual(matchingLocalEntry.value, matchingRemoteEntry.value)) {
								resultingDiff.push(matchingRemoteEntry);
							}
						} else {
							resultingDiff.push({ key, value: undefined, metadata: { updateTime: timestamp } });
							purgedKeys.push(key);
						}

						clearingObject[keys[i]] = null;
					}
				}

				await this.db.set({
					[LocalEntriesStoreName]: clearingObject
				});

				// Remove purged keys from the node lookup tree
				for (const key of purgedKeys) {
					this.nodeLookup.delete(Keypath.parse(key));
				}

				return resultingDiff;
			}

			async getLocalEntryCount(): Promise<number> {
				if (this.isClosed)
					throw new Error("Database is closed.");

				return await this.db.count({}, LocalEntriesStoreName);
			}

			async getConflictingEntries(): Promise<ConflictInfo[]> {
				if (this.isClosed)
					throw new Error("Database is closed.");

				const localEntries = await this.getLocalEntries();
				const localEntryKeys = localEntries.map((entry) => entry.key);

				const matchingRemoteEntries = await this.db.get<any>(localEntryKeys, RemoteEntriesStoreName);
				const conflicts: ConflictInfo[] = [];

				for (let i = 0; i < localEntryKeys.length; i++) {
					const localEntry = localEntries[i];
					const remoteEntry = matchingRemoteEntries[i];

					if (!remoteEntry ||
						localEntry.metadata.syncReferenceTime! > remoteEntry.metadata.commitTime! ||
						LocalDBOperations.valuesAreEqual(localEntry.value, remoteEntry.value)) {
						continue;
					}

					conflicts.push({
						key: localEntry.key,
						path: <NodePath>Keypath.parse(localEntry.key),
						localValue: localEntry.value,
						remoteValue: remoteEntry.value,
						localUpdateTime: <number>localEntry.metadata.updateTime,
						remoteUpdateTime: <number>remoteEntry.metadata.updateTime,
						remoteCommitTime: <number>remoteEntry.metadata.commitTime
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

				const keysSeenInLocalEntries = new StringSet();
				await this.db.createIterator(LocalEntriesStoreName, undefined, {
					transactionMode: "readonly"
				}, async (entry) => {
					if (entry.value !== undefined)
						foreachFunc(entry.value, entry.key, <number>entry.metadata.updateTime);

					keysSeenInLocalEntries.add(entry.key);
				})

				await this.db.createIterator(RemoteEntriesStoreName, undefined, {
					transactionMode: "readonly"
				}, async (entry) => {
					if (entry.value !== undefined && !keysSeenInLocalEntries.has(entry.key))
						foreachFunc(entry.value, entry.key, <number>entry.metadata.updateTime);
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
				this.currentOpenOptions = undefined;
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
			static pathEntriesToKeyEntries(transactionElements: PathEntries): EntryArray<any> {
				const entries: EntryArray<any> = [];

				for (const transactionEntry of transactionElements)
					entries.push({ key: Keypath.stringify(transactionEntry.path), value: transactionEntry.value, metadata: transactionEntry.metadata || {} });

				return entries;
			}

			static verifyAndNormalizeNodePath(path: NodePath | string, errorOnRoot = false): NodePath {
				if (path == null)
					throw new TypeError(`Null or undefined path given`);

				if (typeof path === "string") {
					return [path];
				}

				if (!Array.isArray(path)) {
					throw new TypeError(`Invalid path given: not an array or string`);
				}

				for (const specifier of path) {
					if (typeof specifier !== "string")
						throw new TypeError(`The path ${Keypath.formatPath(path)} contains an non-string specifier`);
				}

				if (errorOnRoot && path.length === 0)
					throw new TypeError(`The root cannot be used as a target for this operation`)

				return path;
			}

			static verifyAndNormalizeEntityPath(path: EntityPath | string | number): EntityPath {
				if (path == null)
					throw new TypeError(`Null or undefined path given`);

				if (typeof path === "string" || typeof path === "number") {
					return [path];
				}

				if (!Array.isArray(path)) {
					throw new TypeError(`Invalid path given: not an array, string or number`);
				}

				for (const specifier of path) {
					const specifierType = typeof specifier;

					if (specifierType !== "string" && specifierType !== "number")
						throw new TypeError(`The path ${Keypath.formatPath(path)} contains a specifier with type other than string or number`);
				}

				return path;
			}

			static cloneEntry(value: any): any {
				return ObjectTools.deepClone(value);
			}

			static valuesAreEqual(value1: any, value2: any): boolean {
				return ObjectTools.deepCompare(value1, value2)
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

		////////////////////////////////////////////////////////////////////////////////////////////////
		// Type schema
		////////////////////////////////////////////////////////////////////////////////////////////////
		export type LocalDBOperationsSchema = {
			open: { Args: [string, LocalDBOptions]; ReturnValue: void };
			commitLocalTransaction: { Args: [Batch]; ReturnValue: EntryArray<any> };
			commitLocalEntries: { Args: [EntryArray<any>]; ReturnValue: EntryArray<any> };
			commitSerializedRemoteEntries: { Args: [Uint8Array, string | undefined]; ReturnValue: EntryArray<any> };
			setAsRemotelyCommited: { Args: [string[], number]; ReturnValue: void };
			getEntity: { Args: [EntityPath]; ReturnValue: any };
			getAllEntries: { Args: undefined[]; ReturnValue: EntryArray<any> };
			getAllKeys: { Args: undefined[]; ReturnValue: string[] };
			getAll: { Args: undefined[]; ReturnValue: PathEntries };
			hasEntity: { Args: [EntityPath]; ReturnValue: boolean };
			getLatestServerMetadata: { Args: undefined[]; ReturnValue: ServerMetadata };
			discardLocalEntryKeys: { Args: [string[]]; ReturnValue: EntryArray<any> };
			getConflictingEntries: { Args: undefined[]; ReturnValue: ConflictInfo[] };
			getSerializedLocalEntries: { Args: [string, string | undefined]; ReturnValue: [Uint8Array, string[]] };
			getLocalEntries: { Args: [string]; ReturnValue: EntryArray<any> };
			getLocalEntryKeys: { Args: [string]; ReturnValue: string[] };
			destroyLocalData: { Args: undefined[]; ReturnValue: void };
			close: { Args: undefined[]; ReturnValue: void };
		}

		type Extends<A extends B, B> = boolean;
		export type LocalDBOperationsSchemaExtendsDispatcherSchema = Extends<LocalDBOperationsSchema, DispatcherSchema>;
		export type LocalDBOperationsSchemaKeysAreValid = Extends<keyof LocalDBOperationsSchema, keyof LocalDBOperations>;
	}
}