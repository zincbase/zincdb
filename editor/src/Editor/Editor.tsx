namespace ZincDB {
	export namespace Editor {
		export type Row = {
			pathString: string;
			formattedValue: string;			
			entry: DB.PathEntry;
		}

		export type ViewState = {
			rows: Row[];

			topBar: {
				datastoreURL: string;
				accessKey: string;
				newEntryPath: string;
			}
		}

		let viewState: ViewState;
		let db: DB.LocalDB;

		export const updateViewStateAndRender = function(patches: Keypath.KeypathAndValue[]) {
			updateViewState(patches);
			render(viewState);
		}

		export const updateViewState = function(patches: Keypath.KeypathAndValue[]) {
			for (const patch of patches) {
				viewState = Keypath.patchImmutableObject(viewState, patch.path, patch.value);
			}
		}

		export const updateRow = async function(pathString: string, newFormattedValue: string) {
			let newValueObject: any;
			try {
				newValueObject = JSON.parse(newFormattedValue);
			} catch (e) {
				log(`Error: couldn't parse '${newFormattedValue}' as JSON`);
				return;
			}

			let indexFound: number = -1;

			for (let i = 0; i < viewState.rows.length; i++) {
				const row = viewState.rows[i];

				if (pathString === row.pathString) {
					indexFound = i;
					break;
				}
			}

			if (indexFound === -1)
				return;

			updateViewState([
				{ path: ["rows", indexFound, "entry", "value"], value: newValueObject },
				{ path: ["rows", indexFound, "formattedValue"], value: newFormattedValue }
			]);

			await db.put(JSON.parse(pathString), newValueObject);
		}

		export const addNewEmptyRow = async function(pathString: string) {
			await db.put(JSON.parse(pathString), null);
			await reloadAllRowsAndRender();
		}		

		export const deleteRow = async function(pathString: string) {
			await db.delete(JSON.parse(pathString));
			await reloadAllRowsAndRender();
		}

		export const reloadAllRowsAndRender = async function() {
			const allEntries = await db.getAll();

			const newRows = allEntries.map<Row>((entry, index) => ({
				pathString: Keypath.formatPath(entry.path),
				entry,
				formattedValue: DB.LocalDBOperations.formatValue(entry.value)
			}));

			updateViewStateAndRender([{ path: ["rows"], value: newRows }]);
		}

		export const reloadDatastoreAndRender = async function() {
			if (db)
				db.close();

			const datastoreURL = viewState.topBar.datastoreURL;
			
			let localDatabaseName: string;
			
			if (Tools.stringStartsWith(datastoreURL, "http://")) {
				localDatabaseName = Encoding.Underscore.encode(datastoreURL.substring(7));
			} else if (Tools.stringStartsWith(datastoreURL, "https://")) {
				localDatabaseName = Encoding.Underscore.encode(datastoreURL.substring(8));
			} else {
				throw new Error(`Invalid protocol in datastore URL '${datastoreURL}'`);
			}

			const accessKey = viewState.topBar.accessKey;

			db = await open(localDatabaseName, {
				remoteSyncURL: datastoreURL,
				remoteAccessKey: accessKey,
				storageMedium: "OnDisk",
				//storageMedium: "InMemory",
				useWorker: true,
			});

			let syncError: any;

			if (datastoreURL !== "") {
				try {
					await db.pullRemoteChanges();
				}
				catch (e) {
					syncError = e;
				}
			}

			await reloadAllRowsAndRender();

			const state = viewState;

			db.subscribe([], async (event) => {
				if (event.origin !== "remote")
					return;

				const patches: Keypath.KeypathAndValue[] = [];

				for (const entry of event.changes) {
					let foundExistingMatch = false;

					state.rows.forEach((row, index) => {
						if (Keypath.areEqual(entry.path, row.entry.path)) {
							if (entry.value === undefined)
								return;
							
							foundExistingMatch = true;

							patches.push(
								{ path: ["rows", index, "entry"], value: entry },
								{ path: ["rows", index, "formattedValue"], value: DB.LocalDBOperations.formatValue(entry.value) }
							);
						}
					})

					if (!foundExistingMatch) {
						await reloadAllRowsAndRender();
						return;
					}
				}
				
				updateViewStateAndRender(patches);
			});

			if (syncError === undefined) {
				if (datastoreURL !== "")
					await db.pullRemoteChanges({ continuous: true });
			} else {
				throw syncError;
			}
		}

		export const createDatastore = async function(datastoreURL: string, accessKey: string) {
			const client = new Client({
				datastoreURL,
				accessKey
			})

			await client.rewriteRaw(new Uint8Array(0));
		}

		export const updateDatastoreURLField = function(newValue: string) {
			updateViewStateAndRender([{ path: ["topBar", "datastoreURL"], value: newValue }]);
			EventLoop.enqueueImmediate(() => localStorage.setItem("ZincEditor.datastoreURL", newValue));
		}

		export const updateAccessKeyField = function(newValue: string) {
			updateViewStateAndRender([{ path: ["topBar", "accessKey"], value: newValue }]);
			EventLoop.enqueueImmediate(() => localStorage.setItem("ZincEditor.accessKey", newValue));
		}

		export const updateNewEntryPathField = function(newValue: string) {
			updateViewStateAndRender([{ path: ["topBar", "newEntryPath"], value: newValue }]);
			EventLoop.enqueueImmediate(() => localStorage.setItem("ZincEditor.newEntryPath", newValue));
		}

		export const pushChanges = async function() {
			await db.pushLocalChanges();
			await reloadAllRowsAndRender();
		}

		export const revertChanges = async function() {
			await db.discardLocalChanges();
			await reloadAllRowsAndRender();
		}

		export const render = function(viewState: ViewState) {
			const rootNode = document.getElementById('root');

			if (rootNode == null)
				throw new Error("Root DOM node was not found");

			ReactDOM.render(
				<App viewState={viewState} />,
				rootNode
			)
		}

		export const start = async function() {
			viewState = {
				rows: [],
				topBar: {
					datastoreURL: localStorage.getItem("ZincEditor.datastoreURL") || "",
					accessKey: localStorage.getItem("ZincEditor.accessKey") || "",
					newEntryPath: localStorage.getItem("ZincEditor.newEntryPath") || ""
				}
			}
			
			reloadDatastoreAndRender();
		}
	}
}