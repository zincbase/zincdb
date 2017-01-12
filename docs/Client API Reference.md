# Low-level Client API Reference

The `Client` object provides a set lightweight abstractions for the [ZincServer REST interface](https://github.com/zincbase/zincserver/blob/master/docs/REST%20API%20reference.md).

## Construction and initialization

**Usage**:

```ts
const client = new ZincDB.Client(options)
```

**Arguments:**
`options` is an object of the form:

* `remoteDatastoreURL` (string, required): the URL for the datastore.
* `accessKey` (string, optional): an access key for the remote datastore, if needed. If specified, must be 40 lowercase hexadecimal characters (160 bits).
* `encryptionKey` (string, optional): an encryption key to locally encrypt individual entries before submitting them to the server. The key would be used to decrypt any encrypted entry received. If provided, must be 32 lowercase hexadecimal characters (representing a 128 bit binary key). 

**Example**:

```ts
var ZincDB = require('zincdb');

var client = new ZincDB.Client({
	datastoreURL: "https://example.com:2345/datastore/MyDatastore",
	accessKey: "3da541559918a808c2402bba5012f6c60b27661c",
	encryptionKey: "912ec803b2ce49e4a541068d495ab570"
})
```

## `read`

Performs a GET request to read entries from the server.

**Usage**:

```ts
client.read(options?)
```

**Arguments:**

* `options` is an object including the properties:
	* `updatedAfter` (number, optional): Return entries updated after a given time (microsecond epoch time). Defaults to `0`.
	* `compactResults` (boolean, optional): Compact results after they are received so only the latest revision to a key is included in the returned results. Defaults to `true`.
	* `waitUntilNonempty` (boolean, optional): If no entries currently satisfy the request, ask the server to wait until at least one is available before returning. This is used to achieve the COMET pattern. Defaults to `false`.	 

**Returns:** A promise resolving to an array of entry objects, of the form:

```ts
[
	{ key: ..., value: ..., metadata: ... }, 
	{ key: ..., value: ..., metadata: ... }, 
	{ key: ..., value: ..., metadata: ... }, 
	...
] 
```

## `readRaw`

_Not documented yet._

## `readFormatted`

_Not documented yet._

## `openWebsocketReader`

Open a websocket to the server and receive current and future revisions.

**Usage**:

```ts
client.openWebsocketReader(options, resultsCallback)
``` 

**Arguments:**

* `options` is an object containing the properties: 
	* `updatedAfter` (number, optional): Return entries updated after a given time (microsecond epoch time). Defaults to `0`. This may include both future and past updates.
	* `compactResults` (boolean, optional): Compact results after they are received so only the latest revision for each key is included in the returned results. Defaults to `true`.
* `resultsCallback` is a function to be called whenever new results are available.

```ts
function resultsCallback(results) {
	...
}
```
Where `results` is an entry object of the same form returned by the `read` method. 

The callback function can optionally return a promise to defer its resolution, e.g.:

```ts
function resultsCallback(results) {
	return new Promise((resolve, reject) {
		...

		resolve();
	});
}
```

If a promise is returned from the callback, subsequent callbacks are guaranteed to be executed serially. I.e. if an update has been received before the execution of a the previous callback has finished, the next one(s) would be queued. 

**Returns:**
A promise that resolves when the websocket has been closed or rejects when an error occurred.

**Remarks:**
To close the websocket, call the `abortActiveRequests` method, documented below, which would also abort all other active requests. There is currently no specialized method to individually close the websocket. To achieve that, instead create a dedicated `Client` object for the websocket connection(s).

## `openRawWebsocketReader`

_Not documented yet._

## `write`

Sends a `POST` request to write revisions to the server.

**Usage**:

```ts
client.write(revisions)
```

**Arguments:**

* `revisions` is an array of entry objects of the form:

```ts
[
	{ key: ..., value: ..., metadata: ... },
	{ key: ..., value: ..., metadata: ... }, 
	{ key: ..., value: ..., metadata: ... }, 
	...
]
```

**Returns:** A promise resolving to a transaction response of object of the form:

```ts
{ 
	commitTimestamp: ... 
}
```

## `writeRaw`
_Not documented yet._

## `writeFormatted`
_Not documented yet._

## `rewrite`
Sends a `PUT` request to the server, which would replace its content of a given set of entries.

**Usage**:

```ts
client.rewrite(entries)
```

**Arguments**:
_Similar to `write`_

**Returns**:
_Similar to `write`_

## `rewriteRaw`
_Not documented yet._

## `rewriteFormatted`
_Not documented yet._

## `destroyRemoteData`

Sends a `DELETE` request to the server, to permanently destroy the remote datastore.

**Usage**:

```ts
client.destroyRemoteData()
``` 

**Returns:** A promise resolving when the operation has completed.

## `abortActiveRequests`

Abort all active requests made by this client object. This would also close any existing websocket connections.

**Usage**:

```ts
client.abortActiveRequests()
``` 

**Returns:** A promise resolving when the operation has completed. 