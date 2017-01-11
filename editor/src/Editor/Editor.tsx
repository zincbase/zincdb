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
				host: string;
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

			const host = viewState.topBar.host;
			const accessKey = viewState.topBar.accessKey;

			db = await open(host, {
				remoteSyncURL: host || undefined,
				remoteAccessKey: accessKey,
				storageMedium: "OnDisk",
				useWebWorker: true,
			});

			if (host !== "") {
				try {
					await db.pullRemoteRevisions();
				} catch (e) {
				}
			}

			await reloadAllRowsAndRender();

			const state = viewState;

			db.subscribe([], async (changes) => {
				if (changes.origin !== "remote")
					return;

				const patches: Keypath.KeypathAndValue[] = [];

				for (const revision of changes.revisions) {
					let foundExistingMatch = false;

					state.rows.forEach((row, index) => {
						if (Keypath.areEqual(revision.path, row.entry.path)) {
							if (revision.value === undefined)
								return;
							
							foundExistingMatch = true;

							patches.push(
								{ path: ["rows", index, "entry"], value: revision },
								{ path: ["rows", index, "formattedValue"], value: DB.LocalDBOperations.formatValue(revision.value) }
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

			if (host !== "")
				db.pullRemoteRevisions({ continuous: true });
		}

		export const updateHostField = function(newValue: string) {
			updateViewStateAndRender([{ path: ["topBar", "host"], value: newValue }]);
			EventLoop.enqueueImmediate(() => localStorage.setItem("ZincEditor.host", newValue));
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
			await db.pushLocalRevisions();
			await reloadAllRowsAndRender();
		}

		export const revertChanges = async function() {
			await db.discardLocalRevisions();
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
					host: localStorage.getItem("ZincEditor.host") || "",
					accessKey: localStorage.getItem("ZincEditor.accessKey") || "",
					newEntryPath: localStorage.getItem("ZincEditor.newEntryPath") || ""
				}
			}

			await reloadDatastoreAndRender();
		}
	}
}