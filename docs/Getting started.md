# Getting started

## Overview

ZincDB is a general purpose database and synchronization library especially suited for real-time and collaborative Javascript applications. Its goal is to reduce the developer's burden of micro-managing local and remote persistence and publish/subscribe operations, by providing a set of simple but powerful high-level abstractions.

## Some notes on the use of promises and async/await

This guide, as well as the [API Reference](https://github.com/zincbase/zincdb/blob/master/docs/API%20Reference.md) heavily relies on ES2015 and ES2016 features like [arrow functions](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Functions/Arrow_functions), [promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) and [async/await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function). It is highly recommended to use a transpiler like [TypeScript](http://typescriptlang.org) or [Babel](https://babeljs.io/) to make the library as easy and convenient to use as possible, while still maintaining support for older browsers. To enable support for promises on older browsers, the library is internally bundled with a polyfill (based on [es6-promise](https://github.com/stefanpenner/es6-promise)) and will install it globally and in its web workers if needed.

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

## Introduction: data model and layout

At its lowest-level, a ZincDB database is just a simple key-value store, where keys are strings and values are arbitrary Javascript objects (a list of supported types is described in detail at the end of this section). It supports the familiar operations `put`, `update`, `get`, `has`, etc. and allows them to be used with string keys, e.g.:

```ts
await db.put("key1", 12);
await db.put("key2", "Hello");
await db.put("key3", [1,2,3]);
await db.get("key2");
await db.has("key2");
await db.update("key3", [3,2,1]);
```

For many applications, that may be sufficient. However, for many others, there may be a need to define "classes" or "tables" so that entries can be partitioned into separate groups. One common approach to extend a "flat" key-value store to a more structured one, is to add prefixes to keys, which results in a "registry-like" layout, e.g.:

```ts
await db.put("permissions.read.allowed", true);
await db.put("permissions.write.allowed", false);
await db.put("connections.max", 12);
await db.put("users.johndoe.profile", "visitor");
await db.get("connections.max");
```

ZincDB adopts this approach but tries to take this a step further by providing built-in support for record hierarchies, as well as checking and enforcing their definitions and usage. However, instead of encoding and decoding this information through prefixes, it accepts arrays of strings as keys (which are eventually serialized to plain strings), for example:

```ts
await db.put(["permissions", "read", "allowed"], true);
await db.put(["permissions", "write", "allowed"], false);
await db.put(["connections", "max"], 12);
await db.put(["users", "johndoe", "profile"], "visitor");
await db.get(["connections", "max"]);
```

The overall resulting structure is very "tree-like". For example, a key like `["permissions", "read", "allowed"]` implies the intermediate paths `["permissions"]` or `["permissions", "read"]`, as addressing "branch" nodes and the entire sequence, i.e. `["permissions", "read", "allowed"]` as representing a "leaf" node (note this also lends itself to the empty array `[]` as representing the top or "root" node - which is supported by the library in lookup operations as well).

One way this differs from a more traditional tree structure, however, is that intermediate nodes are defined _ad-hoc_, i.e. they are introduced on the basis of first-usage alone and do not require any explicit prior declaration. For example, since `["permissions"]` has already been used as an intermediate path (i.e. a "branch" node), trying to subsequently assign it its own value would result in an error:

```ts
wait put(["permissions"], "hi"); // <-- Error here
```

Values can contain most basic Javascript value types. This includes strings, numbers, booleans, objects and arrays. Additionally, typed arrays (`ArrayBuffer`, `Uint8Array`, `Int16Array` etc.), `Date` and `RegExp` objects are supported as well, including when deeply nested in objects or arrays. Objects including circular references are not supported and would result in an error when stored. Objects having prototypes other than `Object` would be simplified to basic objects, ignoring any properties originating from their prototype chain.

Note that when plain strings are used as specifiers, e.g.:

```ts
await db.get("accounts");
```
the key is internally converted to a single node path, with the given key as the first specifier, e.g. the above is exactly identical to:

```ts
await db.get(["accounts"]);
```

## `put()`

The `put()` operation creates a new leaf node or replaces the value of an existing one. For example, the following would store the value `54` at the path `["a", "b", "c"]`:

```ts
await db.put(["a", "b", "c"], 54);
```

Only nodes without children (also called "leaf" nodes) can be assigned values. A path can be used to address a leaf node as long as it has never been used as a prefix to another path, and doesn't extend an existing path already used as a leaf node. For example:

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
```

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
await db.get(["a", "b", "c", "Hello World"]);
```

returning:

```ts
[11, 22, 33, 44]
```

Array elements can be addressed as well, using positive integer identifiers:

```ts
await db.get(["a", "b", "c", "Hello World", 2]);
```

returning:

```ts
33
```

## `has()`

The `has()` operation checks for the existence of a value at a given path:

```ts
await db.has(["a", "b", "c"]);
```
returns:

```ts
true
```

`has` can be used to check for the existence of branch nodes:
```ts
await db.has(["a", "b"]);
```
returns:

```ts
true
```

And even deep properties or array elements
```ts
await db.get(["a", "b", "c", "Hello World", 5]);
```
returns:
```ts
false
```

## `getMulti()` and `hasMulti()`

These allow to get or check for the existence of multiple paths. Please see the [API Reference](https://github.com/zincbase/zincdb/blob/master/docs/API%20Reference.md) for additional information.

## `subscribe()` and `observe()`

Any path that can be retrieved using `get()` can also be subscribed for updates using `subscribe()` or `observe()`. The two methods are identical except `observe` also includes the updated value within its change event:

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

To create a list that is safe for editing by multiple clients, use `addListItem()`. `addListItem` creates a leaf node with a random identifier relative to the supplied branch node, and assigned the value specified on the second argument. The returned promise resolves with generated identifier.

```ts
const db = await ZincDB.open("MyBirthday");

const key1 = await db.addListItem("Guest List", { name: "John" }); // resolves with "YJ5xGKqrCckRKqlZ"
const key2 = await db.addListItem("Guest List", { name: "Dana" }); // resolves with "lNK7CbxfNxFAc1hj"
const key3 = await db.addListItem("Guest List", { name: "John" }); // resolves with "tb0Ve0S3JTVURswh"
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
const t = db.transaction();
```

A transaction can include an arbitrary amount of `put`, `update`, `delete` and `addListItem` operations, in any order, for example:

```ts
t.put(["a", "b"], "hi");
t.update(["a", "b"], "ho");
t.update(["a", "b"], "yo");
t.put(["a", "c"], 55);
t.delete(["a", "b"]);
t.addListItem(["My list"], "Danny");
t.addListItem(["My list"], "Sara");
```
(Note the transaction object's methods return immediately. There's no need to use `await` for each one here)


To finalize (or _commit_) the transaction, use `commit()`:

```ts
await b.commit();
```

The transaction's methods can also be chained, so that the above can be expressed in a single expression:

```ts
await db.transaction()
	.put(["a", "b"], "hi")
	.update(["a", "b"], "ho")
	.update(["a", "b"], "yo")
	.put(["a", "c"], 55)
	.delete(["a", "b"])
	.appendListItem(["My list"], "Danny")
	.appendListItem(["My list"], "Sara")
	.commit();
```

(Note that `appendListItem` is used here, instead of `addListItem`. The two methods are functionally identical, except that `appendListItem` returns the containing transaction object instead of the generated identifier, so it can be used within a chain).

## Setting up a server

See the [ZincServer getting started guide](https://github.com/zincbase/zincserver/blob/master/docs/Getting%20started%20guide.md).

## Synchronizing with a server

To open a database connection which would synchronize with a remote datastore URL, for example with datastore `https://example.com:2345/datastore/MyDB` and access key `3da541559918a808c2402bba5012f6c6`, the following options would be added when calling `open`:

```ts
const db = await ZincDB.open("MyDB", {
	remoteSyncURL: "https://example.com:2345/datastore/MyDB",
	remoteAccessKey: "3da541559918a808c2402bba5012f6c6",
});
```

This will set the given URL as the remote host to synchronize with, but would not execute any synchronization upon opening the database. To update the local database with any unreceived remote changes, call `pullRemoteChanges`:

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

This will only transmit updates applied to descendants of the path `["hi"]`. The update to `["yo", "mate"]` would remain as a pending local changes.

## Handling conflicts

A conflict happens when a local update is made, but is not transmitted to the server, then a remote update for the same node is received. In most other synchronizing databases, this would usually require to resolve the conflict immediately before the received data can be written locally.

ZincDB deals with these scenarios a bit differently. It has a mechanism that allows remote data to be safely, and continuously pulled from the server even if conflicting data exists locally. In such cases, both the local and remote revisions would coexist internally, with the local revisions temporarily "shadowing" the conflicting remote ones. The conflict would only be resolved when `pushLocalChanges()` is finally called.

By default, conflicts would be resolved by choosing the revision with the later update time. To override this behavior, a custom handler can be specified by setting the `conflictHandler` option:

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
