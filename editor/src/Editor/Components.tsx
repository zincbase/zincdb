namespace ZincDB {
	export namespace Editor {

		export class HeaderTableRow extends React.PureComponent<{ titles: string[] }, {}> {
			render() {
				return (
					<tr>
						{this.props.titles.map((content, index) =>
							(<th key={index}>{content}</th>))}
					</tr>
				);
			}
		}

		export class EntryValueCell extends React.Component<{ row: ViewState["rows"][0] }, {}> {
			isEditable = false;
			element: HTMLSpanElement;

			shouldComponentUpdate(nextProps: this["props"], nextState: this["state"]) {
				const nextValueJSON = nextProps.row.formattedValue;
				const currentElementText = this.element.innerText;
				//log(`nextValue: ${nextValueJSON}, currentElementText: ${currentElementText}` );

				return nextValueJSON !== currentElementText;
			}

			componentDidUpdate(prevProps: this["props"], prevState: this["state"]) {
				const currentValueJSON = this.props.row.formattedValue;
				const currentElementText = this.element.innerText;

				//log(`currentValue: ${currentValueJSON}, currentElementText: ${currentElementText}` );
				if (currentValueJSON !== currentElementText)
					this.element.innerText = currentValueJSON;
			}

			render() {
				const row = this.props.row;

				return (<div spellCheck={false} ref={(element) => { this.element = element; }}
					onMouseEnter={(event) => {
						if (this.isEditable)
							return;
						
						if (row.entry.value instanceof Uint8Array)
							return;

						const domNode = event.target;
						domNode['contentEditable'] = true;

						domNode.addEventListener("input", () => {
							const newValueText = domNode["innerText"];
							updateRow(row.pathString, newValueText);
						});

						this.isEditable = true;
					}}>

					{row.formattedValue}
				</div>)
			}
		}

		export class EntryTableRow extends React.PureComponent<{ row: ViewState["rows"][0] }, {}> {
			render() {
				const row = this.props.row;
				assert({metadata: row.entry.metadata}, ({metadata}) => metadata != null);

				const updateTime = row.entry.metadata!.updateTime || 0;
				const commitTime = row.entry.metadata!.commitTime || 0;

				let updateTimeString: string;

				if (updateTime > 0)
					updateTimeString = new Date(updateTime / 1000).toLocaleString();
				else
					updateTimeString = "";

				let commitTimeString: string;

				if (commitTime > 0)
					commitTimeString = new Date(commitTime / 1000).toLocaleString();
				else
					commitTimeString = "";
			
				return (
					<tr>
						<td key="0" title={JSON.stringify(updateTime)}>{updateTimeString}</td>
						<td key="1" title={JSON.stringify(commitTime)}>{commitTimeString}</td>
						<td key="2" title={Keypath.stringify(row.entry.path)}>{row.pathString}</td>
						<td key="3"><EntryValueCell row={row} /></td>
						<td key="4"><span className="fa fa-times" aria-hidden="true" title="Delete entry" onClick={() => deleteRow(row.pathString)}></span></td>
					</tr>
				)
			}
		}

		export class EntryTable extends React.PureComponent<{ className: string, rows: ViewState["rows"] }, {}> {
			render() {
				return (
					<table className={this.props.className}>
						<thead>
							<HeaderTableRow titles={["Update Time", "Commit Time", "Path", "Value", "Actions"]} />
						</thead>
						<tbody>
							{
								this.props.rows.map((row) => (
									<EntryTableRow key={row.pathString} row={row} />
								))
							}
						</tbody>
					</table>
				);
			}
		}

		export class TopBar extends React.PureComponent<{ topBarState: ViewState["topBar"] }, {}> {
			render() {
				return (
					<div id="TopBar">
						<table>
							<tbody>
								<tr>
									<td>Datastore URL: <input
										type="text"
										value={this.props.topBarState.host}
										spellCheck={false}
										onChange={(event) => updateHostField(event.target["value"])}
										onKeyPress={(event) => { if (event.key === "Enter") { reloadDatastoreAndRender() } }} /></td>
									<td>Access key: <input 
										type="password" 
										value={this.props.topBarState.accessKey} 
										onChange={(event) => updateAccessKeyField(event.target["value"])}
										onKeyPress={(event) => { if (event.key === "Enter") { reloadDatastoreAndRender() } }} />
									</td>
									<td><button onClick={pushChanges}>Push changes</button></td>
									<td><button onClick={revertChanges}>Revert changes</button></td>
								</tr>
							</tbody>
						</table>
						<table>
							<tbody>						
								<tr>
								<td>Add new path: <input 
								type="text" 
								value={this.props.topBarState.newEntryPath}
								spellCheck={false}
								onChange={(event) => updateNewEntryPathField(event.target["value"])}
								onKeyPress={(event) => { if (event.key === "Enter") { addNewEmptyRow(this.props.topBarState.newEntryPath) } }} />
								</td>
								</tr>
							</tbody>
						</table>
					</div>
				);
			}
		}

		export class App extends React.PureComponent<{ viewState: ViewState }, {}> {
			render() {
				return (
					<div>
						<TopBar topBarState={this.props.viewState.topBar} />
						<EntryTable className="MainTable" rows={this.props.viewState.rows} />
					</div>
				);
			}
		}
	}
}
