# ZincDB

ZincDB is a database and synchronization library for web applications and beyond. It consists of two 
independent components:

* **A local database**: in-browser object database managed through a high-level API. Provides local storage using either browser based persistence (IndexedDB/WebSQL) or in-memory storage. It is an independent module that works fully offline. It operates and synchronizes in the background, within a web worker (if available).
* **A server**: a secondary, optional component providing a very thin and efficient remote persistence service for single and multi-client synchronization. A single server instance can serve up to tens of thousands of concurrent clients and provide real-time synchronization between them. The server can be run anywhere: in the cloud, on a local network, locally on the same computer, or technically even in an embedded device, tablet or a smartphone.

Read more about the client and server design, capabilities and target use cases at the [technical overview](https://github.com/zincbase/zincdb/blob/master/docs/Technical%20overview.md).

## Installation

For Node.js/Webpack:

```
npm install zincdb
```

For the browser: 

Download the latest stable release [here]().

## Documentation

* [Getting started](https://github.com/zincbase/zincdb/blob/master/docs/Getting%20started.md)
* [API Reference](https://github.com/zincbase/zincdb/blob/master/docs/API%20Reference.md)
* [Client API Reference](https://github.com/zincbase/zincdb/blob/master/docs/Client%20API%20Reference.md)
* [Technical overview](https://github.com/zincbase/zincdb/blob/master/docs/Technical%20overview.md)
* [Contribution guide](https://github.com/zincbase/zincdb/blob/master/docs/Contribution%20guide.md)

For detailed guides on server installation, configuration, API and other reference documents head over to the [ZincServer repository](https://github.com/zincbase/zincserver).

## License

[MIT](https://github.com/zincbase/zincdb/blob/master/LICENSE)