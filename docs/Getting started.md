# Getting started

## Overview

ZincDB is a general purpose database and synchronization library especially suited for real-time and collaborative Javascript applications. Its goal is to reduce the developer's burden of micro-managing local and remote persistence and publish/subscribe operations, by providing a set of simple but powerful high-level abstractions.

## Some notes on the use of promises and async/await

This guide, as well as the [API Reference](https://github.com/zincbase/zincdb/blob/master/docs/API%20Reference.md) heavily rely on ES2015 and ES2016 features like [arrow functions](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Functions/Arrow_functions), [promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) and [async/await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function). It is highly recommended to use a transpiler like [TypeScript](http://typescriptlang.org) or [Babel](https://babeljs.io/) to make the library as easy and convenient to use as possible, while still maintaining support for older browsers. To enable support for promises on older browsers, the library is internally bundled with a polyfill (based on [es6-promise](https://github.com/stefanpenner/es6-promise)) and will install it globally and in its web workers if needed.

## Initializing the library

Initialize a `ZincDB` object:

In Node.js:

```ts
const ZincDB = require("zincdb");
```

Or in the browser:

```html
<script id="zincdb" src="path/to/zincdb.js"></script>
```
(note setting the `id` attribute to `zincdb` is necessary to allow the library to run in a web worker)

## Opening a database

To open a new or existing database, use `open()`:

```ts
const db = await ZincDB.open("MyDatabase");
```

## Storing and retrieving data

A ZincDB database is structured as a single object tree, starting with the root node (represented by the empty array `[]`). Nodes are specified by paths, commonly encoded as arrays of the form `["x", "y", "z", ...]`, where each array member specifies the name of the next child node to follow in the hierarchy.

## `put()`

The `put()` operation creates a new leaf node or replaces the value of an existing one. For example, the following would store the value `54` at the path `["a", "b", "c"]`:

```ts
await db.put(["a", "b", "c"], 54);
```

Only nodes without children (also called "leaf" nodes) can be assigned values. A path can be used as a leaf node as long as it has never been used as a prefix to another path, and doesn't extend an existing path already used as a leaf node. For example:

Attempting to assign any value to the path `["a", "b"]` would now fail:

```ts
await db.put(["a", "b"], "hi"); // Error! the path ["a", "b"] cannot be assigned as it 
                                // shares hertiage with the existing leaf node ["a", "b", "c"]
```

Similarly, attempting to assign to a child of a node previously used as a leaf node would fail:

```ts
await db.put(["a", "b", "c", "d"], 11);// Error! the path ["a", "b", "c", "d"] cannot be assigned as it 
                                       // shares hertiage with the existing leaf node ["a", "b", "c"]
```

Leaf nodes can be assigned with any value type, including simple objects and arrays, or nested combinations of them:

```ts
await db.put(["a", "b", "c"], {
	"Hello World": [
		1, 2, 3, 4
	] 
});
```

## `get()`

The `get()` operation is used to retrieve the value on a given path, for example:

```ts
await db.get(["a", "b", "c"]);
```
returns:

```ts
{
	"Hello World": [
		1, 2, 3, 4
	]
} 
````

In contrast to `put()`, `get()` is more permissive and is not only limited to leaf nodes:

The value of the root node itself can be retrieved, where its children and their descendants would be rendered as object properties.

```ts
await db.get([]);
```
returning:

```ts
{
	a: {
		b: {
			c: {
				"Hello World": [
					11, 22, 33, 44
				] 
			}
		}
	}
}
```

As well as any branch node:

```ts
await db.get(["a", "b"]);
```

returning:

```ts
{
	c: {
		"Hello World": [
			11, 22, 33, 44
		] 
	}	
}
```

Or even properties internal to a leaf node's value or their own descendants.

```ts
await db.get(["a", "b", "C", "Hello World"]);
```

returning:

```ts
[11, 22, 33, 44]
```

Array elements can be addressed as well, using positive integer identifiers:

```ts
await db.get(["a", "b", "C", "Hello World", 2]);
```

returning:

```ts
33
```

## `subscribe()` and `observe()`

Every path that can be retrieved using `get()` can also be subscribed for updates using `subscribe()` or `observe()`. The two methods are identical except `observe` also includes the updated value within its change event:

```ts
await db.subscribe(["a", "b"], (changeEvent) => {
	console.log("Some changes occurred:", changeEvent.changes);
});
```

```ts
await db.observe(["a", "b", "c", "Hello World", 1], (changeEvent) => {
	console.log("The value has changed to " + changeEvent.newValue + "!");
});
```


## `update()`

The `update` operation updates the value of an existing path:

```ts
await db.update(["a", "b", "c"], 55);
```

Like `get()`, `update()` is similarly permissive as in addition to leaf nodes, it also allows updating entire branches:

```ts
await db.update(["a", "b"], {
	c: {
		"Hello World": [
			11, 22, 33, 44, 55
		] 
	}
})
```

The root node itself:

```ts
await db.update([], {
	a: {
		b: {
			c: {
				"Hello World": [
					111, 222, 333 ,444
				] 
			}
		}
	}
})
```

Properties of leaf values:

```ts
await db.update(["a", "b", "c", "Hello World", 1], "yo")
```

However it doesn't allow adding new leaf nodes:

```ts
await db.update(["a", "b"], {
	c: {
		"Hello World": [
			11, 22, 33, 44, 55
		],
	},
	d: 42
})

// Error: Failed updating branch ["a", "b"]. 
// The supplied branch object contained a descendant object whose path could
// not be matched in the database. To create new leaf nodes please use 'put' instead.
```

## `delete()`

The `delete()` operation is exactly identical to `update(path, undefined)` except it doesn't error when the given path isn't found.

## `addListItem()`

To create a list that is safe for editing by multiple clients, use `addListItem()`.

```ts
const db = await ZincDB.open("MyBirthday");

const key1 = await db.addListItem("Guest List", { name: "John" }); // returns "YJ5xGKqrCckRKqlZ"
const key2 = await db.addListItem("Guest List", { name: "Dana" }); // returns "lNK7CbxfNxFAc1hj"
const key3 = await db.addListItem("Guest List", { name: "John" }); // returns "tb0Ve0S3JTVURswh"
```

The database now looks like:

```ts
{
	"Guest List": {
		"YJ5xGKqrCckRKqlZ": { name: "John" },
		"lNK7CbxfNxFAc1hj": { name: "Dana" },
		"tb0Ve0S3JTVURswh": { name: "John" }
	}
}
```

## Transactions

A transaction is a set of write operations executed as a single unit, such that the failure of a single operation causes the entire set of operations to fail, and no data to be written.

To create a new transaction use `transaction()`:

```ts
const b = db.transaction();
```

A transaction can include an arbitrary amount of `put`, `update`, `delete` and `addListItem` operations, in any order, for example:

```ts
b.put(["a", "b"], "hi");
b.update(["a", "b"], "ho");
b.update(["a", "b"], "yo");
b.put(["a", "c"], 55);
b.delete(["a", "b"]);
b.addListItem(["My list"], "Danny");
b.addListItem(["My list"], "Sara");
```
(Note these methods return immediately. There's no need to use `await` for each one here)


To finalize (or _commit_) the transaction, use `commit()`:

```ts
await b.commit();
```

The transaction's methods can also be chained, so that the above can be expressed in a single expression:

```ts
await db.transaction(
	.put(["a", "b"], "hi")
	.update(["a", "b"], "ho")
	.update(["a", "b"], "yo")
	.put(["a", "c"], 55)
	.delete(["a", "b"])
	.appendListItem(["My list"], "Danny")
	.appendListItem(["My list"], "Sara")
	.commit();
```

(Note that `appendListItem` is used here, rather than `addListItem`. The two methods are functionally identical, except that `appendListItem` returns the containing transaction object instead of a string, so it can be used within a chain).

## Setting up a server

See the [ZincServer getting started guide](https://github.com/zincbase/zincserver/blob/master/docs/Getting%20started%20guide.md).

## Synchronizing with a server

To open a database connection which would synchronize with a remote datastore URI, for example with datastore `https://example.com:2345/datastore/MyDB` and access key `3da541559918a808c2402bba5012f6c6`, the following options would be added when calling `open`:

```ts
const db = await ZincDB.open("MyDB", {
	remoteSyncURL: "https://example.com:2345/datastore/MyDB",
	remoteAccessKey: "3da541559918a808c2402bba5012f6c6",
});
```

This will set the given URI as the remote host to synchronize with. To update the local database with any unreceived remote changes, call `pullRemoteChanges`:

```ts
await db.pullRemoteChanges();
```

When entries are updated, like:

```ts
await db.put(["hi", "there"], [9, 8, 7])
await db.delete(["yo", "mate"]);
```

The data is first stored only locally. To transmit these as updates to the server, call `pushLocalChanges`:

```ts
await db.pushLocalChanges();
```

It is also possible to only transmit a subset of the updates made, by specifying the `path` option:

```ts
await db.pushLocalChanges({ path: ["hi"] });
```

This will only transmit updates applied to descendants of the path `["hi"]`. The update made to `["hi", "there"]`, and the update to `["yo", "mate"]` would remain as a pending local changes.

## Handling conflicts

A conflict happens when a local update is made, but is not transmitted to the server, then a remote update for the same node is received. In most other synchronizing databases, this would usually require to resolve the conflict immediately before the received data can be written locally.

ZincDB deals with these scenarios a bit differently. It has a mechanism that allows remote data to be safely, and continuously pulled from the server even if conflicting data exists locally. In such cases, both the local and remote updates would coexist internally, with the local entries temporarily "shadowing" the conflicting remote ones. The conflict is only resolved when `pushLocalChanges()` is finally called.

If no special resolution method is given to `pushLocalChanges`, any conflicts would be resolved by always selecting the entry with the later update time. To override this behavior, a custom handler can be specified with the `conflictHandler` option:

```ts
await db.pushLocalChanges({ conflictHandler: (conflictInfo) => {
	if (conflictInfo.localValue.age > conflictInfo.remoteValue.age) {
		return Promise.resolve(conflictInfo.localValue);
	} else {
		return Promise.resolve(conflictInfo.remoteValue);
	}
}});
```

## Next steps

The full set of methods and options are detailed in the [API Reference](https://github.com/zincbase/zincdb/blob/master/docs/API%20Reference.md).
