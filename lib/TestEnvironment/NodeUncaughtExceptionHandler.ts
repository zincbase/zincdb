namespace ZincDB {
	if (runningInNodeJS()) {
		process.on('uncaughtException', function (e: any) {
			printExceptionAndStackTraceToConsole(e, "Node.js uncaughtException");
		});
	}
}