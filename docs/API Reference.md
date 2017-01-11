# API Reference

## Overview

The core API consists of the following methods:

```ts
// Construction
const db = ZincDB.open(options?);

// Write operations
db.put(path, value)
db.delete(path)
db.update(path, value)
db.addListItem(path, value)
db.transaction()

// Read operations
db.get(path)
db.subscribe(path, handler)
db.unsubscribe(handler)
db.observe(path, handler)
db.unobserve(handler)

// Sync related operations
db.pullRemoteRevisions(options?)
db.pushLocalRevisions(options?)
db.getLocalRevisions(path?)
db.discardLocalRevisions(path?)

// Finalization/destructive operations
db.destroyLocalData()
db.close()
```

## `ZincDB.open`

Opens an existing database or creates a new one, with the given name.

**Usage**:

```ts
ZincDB.open(name, options?);
```

**Arguments**:

* `name` (string, required): The identifier to use when locally persisting data in local storage mediums like IndexedDB or WebSQL. The actual identifier used is additionally prefixed with "Zinc_", i.e.. `Zinc_<name>`.

* `options` (object, optional):
	* `remoteSyncURL` (string, optional): A full URL of a remote datastore to synchronize with.
	* `remoteAccessKey` (string, optional): An access key to use when communicating with the remote datastore host. If provided, must be 32 lowercase hexadecimal characters.
	* `encryptionKey` (string, optional): A key to encrypt or decrypt revisions that are pushed or pulled from the remote datastore. If provided, must be a 32 character lowercase hexadecimal string. Defaults to `undefined`.	
	* `storageMedium` (`"InMemory"`, `"OnDisk"`, `"IndexedDB"` or `"WebSQL"`, optional): Storage medium to use for local persistence. Defaults to "InMemory".
	* `useWebWorker`(boolean, optional): Execute most operations in a web worker, if available. Defaults to `false`.
	* `workerURI` (string, optional): A URI or relative script path to load the worker from. If not specified, the current `document` would be searched for a script tag with an `id` of `zincdb` and its `src` attribute would be used.

**Return value**:

A promise resolving to a database connection object, or rejecting when an error has occurred during the operation.

**Examples**:

Open a database named "MyDB" with no synchronization host defined and default storage options:

```ts
const db = await ZincDB.open("MyDB");
```

Open a database named "MyDB". Set a remote synchronization host and access key. Use default options for storage.

```ts
const db = await ZincDB.open("MyDB", {
	remoteSyncURL: "https://example.com:2345/datastore/MyDB",
	remoteAccessKey: "3da541559918a808c2402bba5012f6c6",
});
```

Open a database named "MyDB" with a remote synchronization host and access key specified, on-disk storage medium, web workers enabled, and an encryption/decryption key:

```ts
const db = await ZincDB.open("MyDB", {
	remoteSyncURL: "https://example.com:2345/datastore/MyDB",
	remoteAccessKey: "3da541559918a808c2402bba5012f6c6",
	storageMedium: "OnDisk",
	useWebWorker: true,
	encryptionKey: "912ec803b2ce49e4a541068d495ab570"
});
```

## `put`

Create or update a leaf node at a the given path.

**Usage**:

```ts
db.put(path, val)
```

**Arguments**:

* `path` (array or string, required): A path specifying the leaf to assign.
* `val` (any, required): The primitive value, object, or array to assign.  

**Return value**

A promise resolving when the data has been successfully written to the database.

**Examples**:

Create a leaf node with an number typed value:

```ts
await db.put(["year"], 2014);
```

Create or update a leaf node with an object typed value:

```ts
await db.put(["people", "John Doe"], {
	age: 26,
	height: 176,
	medals: ["Navy Cross", "Airman's Medal"]
});
```

**Notes**:

* Once a path has been used as a non-leaf node, it cannot assigned anymore. E.g for the above example `db.put(["people"], { ... })` would error.
* Once a path has been used as a leaf node, it cannot be extended with additional children. E.g. `db.put(["people", "John Doe", "x"], { ... })` would error.
* Descendants of leaf node values cannot be created or assigned using `put`. E.g `db.put(["people", "John Doe", "age"], 27)` would error. However, existing ones can be modified by using `update` instead.
* Only string specifiers can be used within paths given to `put()`. To create dynamic lists that are safe for concurrent editing, use `addListItem()` instead.

## `delete`

Deletes a leaf node.

**Usage**:

```ts
db.delete(path)
```

**Arguments**:

* `path` (array, required): the path of the leaf node to delete.

**Return value**:

A promise resolving when the data has been successfully deleted from the database.

**Notes**:

If the given path is not found, the operation would be ignored and no error would be thrown.

## `update`

Update an existing entity in the database.

**Usage**:

```ts
db.update(path, newValue)
```

**Arguments**:

* `path` (array, required): the path of the entity to update. Can be either a leaf node, branch node (including the root), or a leaf node value's descendant property or array index.
* `newValue` (any, required): the new value to assign the entity.

**Example**:

```ts
await db.update(["people", "John Doe"], { // Update an existing branch node
	age: 26,
	height: 176,
	medals: ["Navy Cross", "Airman's Medal"]
});

await db.update(["people", "John Doe", "age"], 27); // Update a value's internal property

await db.update(["people", "Jane Doe", "medals", 1], "Naval Reserve Medal"); // Update a value's descendant array element

await db.update([], { // Update the root branch
	"people": {
		"John Doe": {
			age: 21,
			height: 186,
			medals: ["Airman's Medal"]		
		},
		"Jane Doe": {
			age: 19,
			height: 156,
			medals: []
		}
	}
}); 
```

**Notes**:

* If the given path is an ancestor to one or multiple existing leaf nodes, the given value must be an object, and would internally be matched to each corresponding leaf node within the given path. If an existing node cannot be matched, it will be taken to be deleted. If the object contains properties or descendant properties that cannot be matched in the database, an error will be thrown and the operation would be aborted.

## `addListItem`

Creates a new leaf node with a random identifier as a child to the given container path. This can be use to maintain a list structure that is safe for concurrent editing.

**Usage**:

```ts
db.addListItem(containerPath, value)
```

**Arguments**:

* `containerPath` (array, required): the containing path.
* `value` (any, required): the value to assign to the new list item.

**Return type**:

The 16 character alphanumeric random string which was used as identifier for the new item

**Examples**:

```ts
const key1 = await db.addListItem("Guest List", { name: "John"}); // returns "YJ5xGKqrCckRKqlZ"
const key2 = await db.addListItem("Guest List", { name: "Dana"}); // returns "lNK7CbxfNxFAc1hj"
const key3 = await db.addListItem("Guest List", { name: "John"}); // returns "tb0Ve0S3JTVURswh"
```

The database now looks like:

```json
{
	"Guest List": {
		"YJ5xGKqrCckRKqlZ": { name: "John"},
		"lNK7CbxfNxFAc1hj": { name: "Dana"},
		"tb0Ve0S3JTVURswh": { name: "John"}
	}
}
```

## `transaction`

Open a new transaction, allowing multiple write operations to be performed and committed atomically as a single unit.

**Usage**:

```ts
db.transaction()
```

**Return value**

An object containing the following methods:

* `put`: similar to `db.put`. Returns immediately.
* `delete`: similar to `db.delete`. Returns immediately.
* `update`: similar to `db.update`. Returns immediately.
* `addListItem`: similar to `db.addListItem`. Returns immediately with the new item's identifier as return value.
* `commit`: commits the transaction. Returns a promise that resolves when the data has been successfully commited.

**Examples**:

```ts
const t = db.transaction();
t.put(["people", "James Smith"], { age: 43, height: 185, medals: ["Naval Reserve Medal"] });
t.delete(["dogs", "Scruffy"]);
t.put(["people", "Maria Martinez"], { age: 37, height: 172, medals: ["Purple Heart Medal"] });
t.update(["people", "Maria Martinez", "height"], 174);
t.addListItem(["Guest List"], { name: "Angela" });
t.addListItem(["Guest List"], { name: "Natalie" });
await t.commit();
```

**Notes**:

* If at least one operation errors, the whole transaction would fail and no data would be written.
* Once `commit()` has been called, calling any other method would result in an error.
* Accumulating multiple operations into large, complex transactions can significantly increase write performance if a large quantity of write operations are expected.

## `get`

Retrieves the content of the entity(s) at the given path(s).

**Usage**:

```ts
db.get(path)
```

**Arguments**:

* `path` (array or array of arrays, required): the path(s) of the entity(s) to retrieve. The path can address any type of node (root, branch, leaf) and optionally extend a leaf node's path to its value's internal descendants.

**Return value**:

A promise resolving to the requested data, or `undefined` if it is not found. If multiple paths are specified, they would be contained in an array at the order they were specified.

**Examples**:

Retrieve a leaf node:

```ts
let person = await db.get(["people", "John Doe"]);
```
Returns:

```json
{
	age: 25,
	height: 178,
	medals: ["Navy Cross", "Airman's Medal"]
}
```

Retrieve the content of the root node:

```ts
let root = await db.get([]);
```
Returns:

```json
{ 
	people: {
		"John Doe": {
			age: 25,
			height: 178,
			medals: ["Navy Cross", "Airman's Medal"]
		},
		"Jane Doe": {
			age: 27,
			height: 165,
			medals: ["Coast Guard Medal"]
		}		
	}
}
```

Retrieve a property of a leaf node's value:

```ts
let person = await db.get(["people", "Jane Doe", "age"]);
```
Returns: 

```json
27
```

Retrieve an array element descendant to the leaf node's value:

```ts
let person = await db.get(["people", "John Doe", "medals", 1]);
```
Returns: 

```json
"Airman's Medal"
```

Retrieve multiple paths:

```ts
let results = await db.get([
	["people", "John Doe", "medals"],
	["people", "Jane Doe", "age"],
]);
```
Returns: 

```json
[
	["Navy Cross", "Airman's Medal"],
	27
]
```

## `subscribe` and `observe`

Tracks changes to a given path and its descendants. This includes both local and remote changes. Both `subscribe` and `observe` are essentially identical except that `observe` also includes the updated value each time the handler is called.

**Usage**:

```ts
store.subscribe(path, handler)
// or
store.observe(path, handler)
```

**Arguments**:

* `path` (string or array, required): the path of the entity to watch. This can be any path supported by `get()`.
* `handler` (function, required): a handler function to be called when a relevant modification occurred. The handler function receives single argument representing a `changes` object of the form:

```json
{
	origin, // string, either "local" or "remote"
	revisions, // array of revision objects
	newValue // The new value for the path, if `observe` was used
}
```

Where the `revisions` array is of the form:

```json
[
	{ path: ..., value: ..., metadata: ... },
	{ path: ..., value: ..., metadata: ... },
	{ path: ..., value: ..., metadata: ... },
	...
]
```

`path` is the target node's path, `value` is any type, `metadata` has a metadata object (currently mostly used internally - the specification is likely to change).

**Return value**:

A promise resolving when the handler has been successfully subscribed as a watcher.

**Examples**:

Track all changes to descendants of the path `["reports"]` and re-render a corresponding UI component with the new value each time the handler is called: 

```ts
await db.observe(["reports"], (changes) => { 
	renderReports(changes.newValue); 
})
```

Subscribe to receive all changes to the database and log the revision list on each update:

```ts
await db.subscribe([], (changes) => { 
	console.log(changes.origin + " changes announced!");
	
	changes.revisions.map((revision) => {
		console.log("keypath: " + revision.keypath + ", value: " + JSON.stringify(revision.value));
	})
})
```

**Notes**:

* Remote revisions that are shadowed by conflicting, pending local revisions would not be announced to the subscriber. The only current way to access them is when resolving conflicts using a custom conflict handler.
* Observing large and complex objects like the root may be a very expensive operation if rapid updates are expected, as the entire database might need to loaded be reconstructed at every small update. It is therefore recommended to use `subscribe()` instead or create many observers to individual small objects and perform any needed operation immediately, rather than trying to maintain an up-to-date copy of the entire root object tree or a large branch node.

## `unsubscribe`

Unsubscribe a handler previously set by calling `subscribe()` or `observe()`.

**Usage**:

```ts
db.unsubscribe(handler)
```

**Return value**:

A promise resolving when the handler has been successfully unsubscribed.

**Arguments**

`handler`: the handler function previously registered with `subscribe()` or `observe()`.

## `pullRemoteRevisions`

Retrieve and then locally commit new revisions from the remote server.

**Usage**:

```ts
db.pullRemoteRevisions(options?)
```

**Arguments**:

* `options` (object, optional): 
	* `continuous` (boolean, optional): enable continuous mode, where a websocket or COMET is used to automatically fetch new revision from the server whenever they are available. Defaults to `false`.
	* `useWebsocket` (boolean, optional): use a websocket, if available, when continuous mode is enabled, otherwise use COMET. Defaults to `true`. 

**Return value**:

A promise resolving when the operation has completed, or rejecting when it fails.

**Examples**:

Pull remote revisions once:

```ts
await db.pullRemoteRevisions()
```

Continuously pull new revisions from the remote server:

```ts
db.pullRemoteRevisions({ continuous: true }).catch((err) => {
	console.log("Fatal error when pulling remote revisions: " + err.message);
});
```
(note the returned promise does not need to be awaited in this case as it will only resolve when `db.close()` is called. Instead, only a `catch` handler is applied to the promise, which would be called when a fatal error occurs)

**Notes**

* When `pullRemoteRevisions` is executing in continuous mode, the only way to abort the operation is to close the database connection by calling `close()`.
* If a revision containing an invalid node path is received from the server, it will be ignored and a warning message would be logged to the error console. 

## `pushLocalRevisions`

Submit pending local revisions to the remote server.

```ts
db.pushLocalRevisions(options?)
```

**Arguments**:

* `options` (object, optional):
	* `path` (array or string, optional): Only submit local revisions to the given path's descendants. 
	* `conflictHandler` (function, optional): A custom callback function to handle merge conflicts, described in detail in a separate section below. If no handler is specified, merge conflicts are automatically resolved with the revision with the later update timestamp.

**Return value**:

A promise resolving when the operation has completed, or rejecting when it fails.

**Examples**:

Update the database and submit all pending local revisions (merge conflicts would be resolved automatically using the default behavior).

```ts
await db.put(["people", "Jane Doe"], {
	age: 12,
	height: 158,
	medals: []
});

await db.pushLocalRevisions();
```

Update particular nodes and only submit revisions made to their container array. Handle any merge conflict with a custom handler.

```ts
let t = db.transaction();
t.put(["dogs", "Buddy"], { age: 5, height: 80, medals: ["House Guard Extraordinaire"]});
t.put(["dogs", "Scruffy"], { age: 8, height: 50/ medals: ["Fastest Retriever", "Loudest Bark"] });
await t.commit();

await db.pushLocalRevisions({
	path: ["dogs"],
	conflictHandler: (conflictInfo) => {
		if (conflictInfo.localValue.age > conflictInfo.remoteValue.age) {
			return Promise.resolve(conflictInfo.localValue);
		} else {
			return Promise.resolve(conflictInfo.remoteValue);
		}
	}
});
```

**Notes**:

* Once a local revision has been successfully transmitted to a remote server, its status immediately changes from "local" to "remote".

**Custom conflict handlers**:

A custom conflict handler is a function used to manually resolve merge conflicts. It is of the form:

```ts
function conflictHandler(conflictInfo) {
	// ...
	return Promise.resolve(resolvingValue);
}
```

The handler's return value must be a promise. Returning a promise allows to defer resolution beyond the runtime of the handler function itself thus leaving as much time as needed to alert a user through the UI to provide a custom resolving value, which may be different from either the local or remote values.

`conflictInfo` is an object of the form:

```json
{
	path, // string array
	key, // string
	localValue, // any type
	remoteValue, // any type
	localUpdateTime, // number
	remoteUpdateTime, // number
	remoteCommitTime, // number
}
```

* `path` is the path of the node having conflicting revisions.
* `key` is the encoded path that was used with the serialized entry.
* `localValue` is the value in a local revision that has not yet been submitted to the server. 
* `remoteValue` is the value in a remote revision having the same path, that was received after the _first_ time an unsubmitted local revision was created for that path (note both unsubmitted local revisions and newer remote revisions may coexist locally, the mechanism for this is explained at the last remark below).
* `localUpdateTime` is the time (microsecond unix epoch) the local revision has been last updated. 
* `remoteUpdateTime` is the time (microsecond unix epoch) the remote revision has been last updated. 
* `remoteCommitTime` is the time (microsecond unix epoch) the remote revision has been commited to the server.

Notes:

* If `remoteValue` is `undefined`, it means the value has been deleted remotely.
* If the handler returns a promise resolving with `undefined`, e.g. `return Promise.resolve(undefined)`, the resolving value would be taken as a deletion operation for that path.
* When a custom conflict handler is supplied, it is recommended to use `continuous` remote revisions sync mode to ensure the most up-to-date remote revisions before merge conflicts are resolved.
* As part of the internal design of ZincDB, it is safe to pull new remote revisions even if conflicting pending local revisions already exist. In this scenario the remote revisions are still retrieved and stored locally, but are 'shadowed' by the pending local revisions until the conflict is resolved (internally local and remote revisions are stored separately in two different datastores/tables).

## `discardLocalRevisions`

Discard pending local revisions, i.e. local revisions that have not yet been transmitted to the remote server using `pushLocalRevisions()`.

**Usage**:

```ts
db.discardLocalRevisions(path?)
```

**Arguments**:

* `path` (string or array, optional): the root node for the local revisions to discard.

**Return value**:

A promise resolving when the matching local revisions have been successfully discarded.

**Example**:

Discard all local revisions to a particular array element.

```ts
await db.put(["dogs", "Lucy"], { "mmm": "OOPS??" });
await db.discardLocalRevisions(["dogs", "Lucy"]);
```

**Notes**:

When a local revision to a particular value or object is discarded, it is automatically rolled back to the most recent remote revision known. Note that after a local revision is submitted using `pushLocalRevisions()`, its status internally changes from 'local' to 'remote' and it cannot be discarded anymore.

## `getLocalRevisions`

Get local changes that have not yet been submitted to the remote server.

**Usage**:

```ts
db.getLocalRevisions(path?)
```

**Arguments**:

* `path` (string or array, optional): the root node for the local revisions to retrieve.

**Return value**:

A promise resolving with the list of matching local revisions. The list is similar in form to the one given by `observe` and `subscribe`:

```ts
[
	{ path: ..., value: ..., metadata: ... },
	{ path: ..., value: ..., metadata: ... },
	{ path: ..., value: ..., metadata: ... },
	...
]
```

## `destroyLocalData`

Destroy all locally stored data for the database. This has no effect on data stored on the server.

**Usage**:

```ts
db.destroyLocalData()
```

**Return value**:

A promise resolving when all local data has been successfully deleted.

**Notes**:

* When IndexedDB or WebSQL is used as a storage medium, the underlying database and all of its internal object stores would be permanently deleted from the browser. This has no impact on any data that may be stored on a remote server.
* The WebSQL standard does not provide a method to delete the databases themselves. After the data has been wiped, an empty WebSQL database with no tables may still remain.

## `close`

Close the database connection. Will abort any ongoing sync operations.

**Usage**:

```ts
db.close()
```

**Return value**:

A promise resolving when the database has been successfully closed.

**Notes**:

When _in-memory_ storage medium is used, all locally stored data for the given database would be **permanently deleted**. This has no impact on data stored on a remote server.

Once a database object has been closed, it cannot be used anymore. Any call to one of its functions would result in an error. 

# Utility methods

## `ZincDB.parsePath`

Converts a path from its string encoding to its array representation.

**Usage**:

```ts
ZincDB.parsePath(pathString)
```

**Arguments**:

* `pathString` (string, required): A string encoded path. 

**Return Value**:

The parsed path, as an array.

**Examples**:

```ts
ZincDB.parsePath("['data']['profiles']['users'][4]")
```

Returns the array `["data", "profiles", "users", 4]`.

## `ZincDB.stringifyPath`

Serializes an array based path to its string encoding.

**Usage**:

```ts
ZincDB.stringifyPath(path)
```

**Arguments**:

* `path` (array, required): A path to stringify.

**Return Value**:

The parsed path, as an array.

**Examples**:

```ts
ZincDB.stringifyPath(["data", "profiles", "users", 4])
```
Returns the string `"['data']['profiles']['users'][4]"`.

## `ZincDB.randKey`

Returns a random alphanumeric string. For use as keys for list objects that are intended to be modified concurrently by multiple sources (used internally by `addListItem()`).

**Usage**:

```ts
ZincDB.randKey()
```

**Return Value**:

A 16 character random alphanumeric string, generated using a secure source, representing an entropy of about 100 bits.
