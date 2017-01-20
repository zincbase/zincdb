# ZincDB

[![Build status](https://travis-ci.org/zincbase/zincdb.svg?branch=master)](https://travis-ci.org/zincbase/zincdb)
[![npm version](https://badge.fury.io/js/zincdb.svg)](https://badge.fury.io/js/zincdb)
[![Chat on Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/zincbase/Lobby?utm_source=share-link&utm_medium=link&utm_campaign=share-link)

ZincDB is a database and synchronization library for Javascript applications. Together with [ZincServer](https://github.com/zincbase/zincserver), it can provide a near-complete solution for the storage and management of in-application data. It can also be used on its own: as an in-browser, offline, or as a standalone embedded Node.js database.

Some of its features:

* Real-time synchronization and multi-user collaboration through a WebSocket or COMET connection to a [ZincServer](https://github.com/zincbase/zincserver) instance.
* Subscribe for updates for specific objects or values.
* Operates in a web-worker (browser) or child process (Node.js). Optimized for short loading times and minimal impact over the responsiveness of the hosting application.
* Pluggable storage engines: IndexedDB, WebSQL, LevelDB (Node.js), SQLite (Node.js), In-memory.

Learn more about the ZincBase framework's client and server design, capabilities and target use cases at the [technical overview](https://github.com/zincbase/zincdb/blob/master/docs/Technical%20overview.md).

## Status

The library is mostly feature complete, but still at an alpha level of stability, and is not ready for production use just yet. Breaking changes are still introduced quite frequently, both to the API and the underlying storage formats. If you choose to experiment with it, please report any unexpected error or behavior at the [issue tracker](https://github.com/zincbase/zincdb/issues). Your feedback would be highly appreciated!

## Platform compatibility

Supports Chrome, Firefox, Edge, IE 10+, Opera, Android 4+, Safari 5.1+, Node.js 4+, Apache Cordova (not yet tested), nw.js (not yet tested), electron (not yet tested).

## Installation

Node.js:

```
npm install zincdb
```

Browser ([download](https://unpkg.com/zincdb)):

```html
<script id="zincdb" src="https://unpkg.com/zincdb"></script>
```

Minified version ([download](https://unpkg.com/zincdb/production/zincdb.min.js))
```html
<script id="zincdb" src="https://unpkg.com/zincdb/production/zincdb.min.js"></script>
```

(To reference a specific library version use the pattern `https://unpkg.com/zincdb@<version>`)

## Documentation

* [Getting started](https://github.com/zincbase/zincdb/blob/master/docs/Getting%20started.md)
* [API Reference](https://github.com/zincbase/zincdb/blob/master/docs/API%20Reference.md)
* [Client API Reference](https://github.com/zincbase/zincdb/blob/master/docs/Client%20API%20Reference.md)
* [Technical overview](https://github.com/zincbase/zincdb/blob/master/docs/Technical%20overview.md)
* [Contribution guide](https://github.com/zincbase/zincdb/blob/master/docs/Contribution%20guide.md)

For instructions on installing and configuring a server see the [ZincServer getting started guide](https://github.com/zincbase/zincserver/blob/master/docs/Getting%20started.md).

## License

[MIT](https://github.com/zincbase/zincdb/blob/master/LICENSE)