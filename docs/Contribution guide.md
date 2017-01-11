# Contribution guide

## Building from source

Make sure that both [Git](https://git-scm.com/downloads) and latest [Node.js](https://nodejs.org/en/) are installed.

Run:
```
git clone https://github.com/zincbase/zincdb.git
cd zincdb
npm install
npm run build
```

## Editing the code

* The code is written entirely in TypeScript. It is highly recommended to use [Visual Studio Code](https://code.visualstudio.com/) to edit it.
* Once the workspace is opened in the editor, it is pre-configured for instant TypeScript compilation and type checking feedback.

## Running the tests

The tests are performed with [mocha](https://github.com/mochajs/mocha) test runner and the [expectations](https://github.com/spmason/expectations) assertion library.

* Before running the tests. Make sure you have an installed and running ZincServer instance. Server installation instruction are described [here](https://github.com/zincbase/zincserver/blob/master/docs/Getting%20started%20guide.md).
* At the root directory, create a new file named `testconfig.js` with content similar to `ZincDBTestConfig = { host: "http://localhost:8002", accessKey: "4d2d3fb0356cf6a66617e6454641697b"}`. Replace the `host` and `accessKey` values with their appropriate values for your server instance.
* To test in Node.js, run `npm test` at the repository root.
* To test in [Phantomjs](http://phantomjs.org/), run `npm run testphantom`.
* To test in web browsers, run `npm run devserver` at the repository root and open `http://localhost:8888/tests` in a web browser.

## Directory structure

* `lib` is the library source code root.
* `build/production` contains the latest production build generated.
* `build/development` contains the latest development build generated. The development build contains the tests, benchmarks and the editor in the addition to what is included in the production build. This build would also be continuously updated if used with TypeScript's live compilation.
* `tests` is the base directory for web based testing. Sources are at `tests/src`.
* `benchmarks` is the base directory for benchmarking in web browsers. Sources are at `benchmarks/src`.
* `editor` is the editor's base directory, including its HTML and stylesheets. Sources are at `editor/src`.
* `docs` contains the documentation.

## Library source directory structure

The `src` directory contains the following subdirectories:

* `Types` - global type definitions.
* `Globals` - global utility functions and polyfills.
* `Library` - many utility classes and functions used internally, covering areas like cryptography, hashing, data structures, encoding, scheduling, parsing, keypaths, and many others..
* `NodeLibrary` - utility functions particular to Node.js.
* `DB` - the actual ZincDB database source code.

## Coding style and conventions

* Standard TypeScript code formatting.
* Latest ES6 features like arrow functions, `let`/`const`, destructuring, etc. whenever possible.
* `async`/`await` instead of promises whenever possible.
* Strictest TypeScript compiler options are enabled: `--noImplicitAny`, `--strictNullChecks`, `--noUnusedLocals`, `--noImplicitReturns`, `--noImplicitThis`.
* Compile with latest nightly `tsc` builds (they appear to be very stable in general).
* No external library dependencies for the browser side, except for very special cases.