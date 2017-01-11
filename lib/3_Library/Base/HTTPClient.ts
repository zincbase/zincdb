namespace ZincDB {
	export namespace HTTPClient {
		if (runningInNodeJS()) {
			var NodeURL: typeof url = require("url");
			var NodeHTTP: typeof http = require("http");
			var NodeHTTPS: typeof https = require("https");
		}

		let keepAliveNodeHTTPAgent: http.Agent;
		let keepAliveNodeHTTPSAgent: https.Agent;
		
		export const requestAndErrorOnUnexpectedResponse = async function(options: OptionalizedHTTPRequestOptions): Promise<HTTPClientResponse> {
			const response = await request(<any> options);

			if (response.statusCode >= 400) {
				let body: string;

				if (response.responseType === "arraybuffer")
					body = Encoding.UTF8.decode(<Uint8Array>response.body);
				else
					body = <string>response.body;

				throw new HTTPError(`Server response code ${response.statusCode}, body: ${body}`);
			}

			return response;
		}

		export const request = async function(options: HTTPRequestOptions): Promise<HTTPClientResponse> {
			const defaultOptions: HTTPRequestOptions =
				{
					url: "",
					method: "GET",
					responseType: "text",
					responseEncoding: "utf8",
					requestHeaders: {},
					timeout: 0,
					sendCrossDomainCredentials: false,
					body: undefined,
					ignoreResponseBody: false,
					keepAlive: true,
					abortSignalSource: new SignalSource()
				}

			options = ObjectTools.override(defaultOptions, options);

			if (<string>options.responseType === "")
				options.responseType = "text";

			// Test for supported response type
			if (options.responseType !== "text" && options.responseType !== "arraybuffer")
				throw new Error(`requestUsingNodeHTTPModules: only 'text' and 'arraybuffer' response types are supported`);

			// Ensure no attempt is made to send a request body if the method is GET.
			if (options.method === "GET")
				options.body = undefined;

			if (runningInNodeJS())
				return await HTTPClient.requestUsingNodeHTTPModules(options);
			else if (typeof XMLHttpRequest === "function" || typeof XMLHttpRequest === "object")
				return await HTTPClient.requestUsingXMLHttpRequest(options);
			else
				throw new Error(`No supported HTTP module found`);
		}

		export const requestUsingXMLHttpRequest = async function(options: HTTPRequestOptions): Promise<HTTPClientResponse> {
			const requestPromise = new OpenPromise<HTTPClientResponse>();
			const httpRequest = new XMLHttpRequest();
			
			if (options.body != null && typeof options.body !== "string" && !(options.body instanceof Uint8Array))
				requestPromise.reject(new Error("Only string and Uint8Array body types are supported at the browser platform"));
			
			httpRequest.open(options.method, options.url, true);
			httpRequest.withCredentials = options.sendCrossDomainCredentials;
			httpRequest.timeout = options.timeout;
			httpRequest.responseType = options.responseType;

			for (const headerName in options.requestHeaders)
				httpRequest.setRequestHeader(headerName, options.requestHeaders[headerName])

			const abortRequest = () => httpRequest.abort();
			options.abortSignalSource.subscribe(abortRequest);

			httpRequest.addEventListener("load", (ev: ProgressEvent) => {
				options.abortSignalSource.unsubscribe(abortRequest);

				const responseHeaders: { [key: string]: string } = {};

				const splitHeaders = httpRequest.getAllResponseHeaders().split(/\r?\n/);
				for (let i = 0; i < splitHeaders.length; i++) {
					const parsedHeader = splitHeaders[i].match(/^([^:]+)\s*:\s*(.*)$/);

					if (parsedHeader && parsedHeader.length === 3)
						responseHeaders[parsedHeader[1].toLowerCase()] = parsedHeader[2];
				}

				let responseBody: string | Uint8Array;

				if (httpRequest.response == null) {
					if (httpRequest.responseType === "arraybuffer")
						responseBody = new Uint8Array(0);
					else
						responseBody = "";
				}
				else if (httpRequest.response instanceof ArrayBuffer)
					responseBody = new Uint8Array(httpRequest.response);
				else
					responseBody = httpRequest.response;

				const responseObject: HTTPClientResponse =
					{
						headers: responseHeaders,
						body: responseBody,
						responseType: <any>httpRequest.responseType,
						statusCode: httpRequest.status,
						statusText: httpRequest.statusText,
					};

				requestPromise.resolve(responseObject);
			});

			httpRequest.addEventListener("error", (ev: ProgressEvent) => {
				options.abortSignalSource.unsubscribe(abortRequest);
				requestPromise.reject(new NetworkError(`HTTP request to '${options.url}' encountered a network error`));
			});

			httpRequest.addEventListener("abort", (ev: ProgressEvent) => {
				options.abortSignalSource.unsubscribe(abortRequest);
				requestPromise.reject(new PromiseCanceledError(`HTTP Request to '${options.url}' was canceled`));
			});

			let requestBody: string | ArrayBuffer | undefined;

			if (options.body == null)
				requestBody = undefined;
			else if (typeof options.body === "string")
				requestBody = <string>options.body;
			else if (options.body instanceof Uint8Array)
				requestBody = (<Uint8Array>options.body).buffer;
			else {
				requestPromise.reject(new TypeError(`Request body can only be of type 'string' or 'Uint8Array'`));
				return requestPromise;
			}

			httpRequest.send(requestBody);
			return requestPromise;
		}

		export const requestUsingNodeHTTPModules = async function(options: HTTPRequestOptions): Promise<HTTPClientResponse> {
			if (!keepAliveNodeHTTPAgent)
				keepAliveNodeHTTPAgent = new NodeHTTP.Agent({ keepAlive: true });

			if (!keepAliveNodeHTTPSAgent)
				keepAliveNodeHTTPSAgent = new NodeHTTPS.Agent({ keepAlive: true });

			// Parse URL
			const parsedUrl = NodeURL.parse(options.url);

			// Parse port number
			let portNumber = parseInt(parsedUrl.port || "");

			if (isNaN(portNumber)) {
				if (parsedUrl.protocol == "http:")
					portNumber = 80;
				else if (parsedUrl.protocol == "https:")
					portNumber = 443;
			}

			// Add headers
			options.requestHeaders["Accept-Encoding"] = "gzip, deflate";

			const requestOptions: https.RequestOptions =
				{
					method: options.method,

					protocol: parsedUrl.protocol,

					hostname: parsedUrl.hostname,
					port: portNumber,
					auth: parsedUrl.auth,
					path: parsedUrl.path,

					headers: options.requestHeaders,
					agent: undefined,

					rejectUnauthorized: false
				};

			let clientRequest: http.ClientRequest;
			const requestPromise = new OpenPromise<HTTPClientResponse>();

			if (parsedUrl.protocol == "http:") {
				if (options.keepAlive)
					requestOptions.agent = keepAliveNodeHTTPAgent;

				clientRequest = NodeHTTP.request(requestOptions, onResponse);
			}
			else if (parsedUrl.protocol == "https:") {
				if (options.keepAlive)
					requestOptions.agent = <any>keepAliveNodeHTTPSAgent;

				clientRequest = NodeHTTPS.request(requestOptions, onResponse);
			}
			else
				throw new Error(`Unsupported protocol: ${parsedUrl.protocol}`);

			// Set request timeout
			clientRequest.setTimeout(options.timeout);

			const abortRequest = () => clientRequest.abort();
			options.abortSignalSource.subscribe(abortRequest);

			clientRequest.on('error', (e: any) => {
				options.abortSignalSource.unsubscribe(abortRequest);
				requestPromise.reject(new NetworkError(e.message));
			});

			clientRequest.on('abort', (e: any) => {
				options.abortSignalSource.unsubscribe(abortRequest);
				requestPromise.reject(new PromiseCanceledError(`HTTP Request to '${options.url}' was canceled`));
			});

			// Start the request by sending the request body
			if (options.body) {
				if (options.body instanceof Uint8Array)
					options.body = BufferTools.uint8ArrayToBuffer(<Uint8Array>options.body);

				if (typeof options.body !== "string" && !Buffer.isBuffer(options.body))
					requestPromise.reject(new Error("Only string, Uint8Array and Buffer body types are supported at the node platform."));

				clientRequest.end(options.body);
			}
			else
				clientRequest.end();

			async function onResponse(incomingMessage: http.IncomingMessage) {
				options.abortSignalSource.unsubscribe(abortRequest);

				const contentEncoding = incomingMessage.headers["content-encoding"];
				let responseStream: stream.Readable;

				if (contentEncoding === "gzip" || contentEncoding === "deflate")
					responseStream = <stream.Readable><any>incomingMessage.pipe(Compression.createDecompressionStream());
				else
					responseStream = incomingMessage;

				const responseBodyBuffer = await StreamExtensions.readCompleteStream(responseStream, undefined, options.ignoreResponseBody);
				let responseBody: string | Uint8Array;

				if (options.responseType === "text")
					responseBody = responseBodyBuffer.toString(options.responseEncoding);
				else
					responseBody = BufferTools.bufferToUint8Array(responseBodyBuffer);

				const resultingResponseObject: HTTPClientResponse =
					{
						httpVersion: incomingMessage.httpVersion,
						statusCode: incomingMessage.statusCode || 0,
						statusText: incomingMessage.statusMessage || "",
						headers: incomingMessage.headers,
						responseType: options.responseType,
						body: responseBody
					}

				requestPromise.resolve(resultingResponseObject);
			}

			return await requestPromise;
		}
	}

	export type HTTPRequestMethod = "GET" | "HEAD" | "POST" | "PUT" | "DELETE" | "TRACE" | "OPTIONS" | "CONNECT" | "PATCH";

	export type HTTPRequestOptions =
		{
			method: HTTPRequestMethod;
			url: string;
			requestHeaders: { [key: string]: string };
			body: Uint8Array | Buffer | string | undefined;
			timeout: number;
			sendCrossDomainCredentials: boolean;
			keepAlive: boolean;
			ignoreResponseBody: boolean;
			responseType: "text" | "arraybuffer";
			responseEncoding: string;
			abortSignalSource: SignalSource;
		}
	
	//export type Optionalize<T> = { [P in keyof T]?: T[P]; };

	export type OptionalizedHTTPRequestOptions = { [key in keyof HTTPRequestOptions]?: HTTPRequestOptions[key] };

	export interface HTTPClientResponse {
		httpVersion?: string;
		statusCode: number;
		statusText: string;

		headers: { [key: string]: string };
		body: Uint8Array | string;

		responseType: "text" | "arraybuffer";
	}

	export class NetworkError extends Error {
		name = "NetworkError";
	}

	export class HTTPError extends Error {
		name = "HTTPError";
	}

	/*
	export class NetworkError extends Error {
		constructor(message: string) {
			super()
			this.name = "NetworkError";
			this.message = message;
			this.stack = new Error().stack;
		}
	}
	*/
}