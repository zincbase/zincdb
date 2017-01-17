namespace ZincDB {
	export namespace DB {
		export const buildNodeDatabaseFilePath = function (dbName: string, storageDirectory: string): string {
			let filePath: string;

			if (storageDirectory != null && storageDirectory.length > 0)
				filePath = storageDirectory + "/" + dbName;
			else
				filePath = dbName;

			return require("path").posix.normalize(filePath);
		}
	}
}