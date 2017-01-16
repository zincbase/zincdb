# Technical overview

ZincBase is a distributed database platform aiming to provide a full solution for the storage and retrieval of application data, both locally and in the cloud. It consists of two independents components:

## [ZincDB](https://github.com/zincbase/zincdb)

A Javascript object database managed through a high-level API, available as a library. Provides local storage using either browser based persistence (IndexedDB/WebSQL), an external library (SQLite in Node.js) or in-memory storage. It is an independent module that works fully offline. It operates and synchronizes in the background, within a web worker (if available).

Features:

* Hierarchal data model. Compatible with plain JavaScript objects.
* Fully asynchronous (promise based).
* Selectable IndexedDB/WebSQL/SQLite/In-memory storage adapters with automatic fallbacks based on availability.
* Runs in a web worker (if available). Designed for short loading times and minimal impact over the responsiveness of the main application or web-page.
* Supports raw binary data.
* Fine-grained customization of background synchronization types (manual, automatic, unidirectional, bidirectional, WebSocket, COMET etc.).
* Asynchronous, sophisticated interactive conflict resolution.
* Built-in end-to-end encryption (optional).
* Supports Chrome, Firefox, IE 10+, Edge, Opera, Android 4+, Safari 5.1+, Node.js 4+, Apache Cordova (not yet tested), nw.js (not yet tested), electron (not yet tested).


## [ZincServer](https://github.com/zincbase/zincserver)

A secondary, optional server back-end providing a very thin and efficient remote persistence service for single and multi-client synchronization. A single server instance can serve up to tens of thousands of concurrent clients and provide real-time synchronization between them. The server can be run anywhere: in the cloud, at a local network, locally on the same computer, or possibly even on an embedded device, tablet or a smartphone.

ZincServer is highly configurable and can provide a partial or even full replacement for custom application servers. Unlike most database servers it was designed to be fully open to the global internet and interfaced directly from browsers, mobile or desktop applications.

Features:

* [Chronological keyed datastore](https://github.com/zincbase/zincserver/blob/master/docs/Technical%20overview.md).
* Built on a custom, on-disk, fully ACID, high performance storage engine based on append-only files. Written in Go.
* Can serve an arbitrary number of datastores and up to several tens of thousands concurrent requests on consumer hardware, with low memory footprint for any given instance.
* WebSocket and COMET support for real-time synchronization.
* Per datastore, per user access control, permissions, rate limits and quotas.
* Fully live reconfiguration without any need for server restarts.
* IP filters and loopback only mode.
* Flood protection.

## Use cases (framework)

The use cases are highly varied, and are not only limited to web applications:

* Web applications that require per-user storage, either local-only, or in the cloud (one remote datastore per user).
* Web applications that provide online collaboration between multiple concurrent participants (one datastore per group).
* Single-page web sites, which may be dynamically generated and updated according to raw data cached locally and/or fetched from a remote server (one or several datastores for the whole website). This may include binary data like images or raw resources.
* Browser extensions that require synchronization of data.
* Desktop or mobile applications developed in frameworks like electron, nw.js, UWP or Apache Cordova.
* Web-based enterprise applications.
* IoT and embedded applications, especially ones requiring real-time tracking and monitoring (one or several datastores per device).
* Caching of database query result sets or other types of structured data.
* A distributed server-side-only database.

## Use cases (server only)

* A message broker.
* A logging server.
* A transactional file system.
