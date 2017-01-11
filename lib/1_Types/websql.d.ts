// Type definitions for Apache Cordova WebSQL plugin.
// Project: https://github.com/MSOpenTech/cordova-plugin-websql
// Definitions by: Microsoft Open Technologies, Inc. <http://msopentech.com>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// 
// Copyright (c) Microsoft Open Technologies, Inc.
// Licensed under the MIT license.

/**
* Creates (opens, if exist) database with supplied parameters.
* @param  name        Database name
* @param  version     Database version
* @param  displayname Database display name
* @param  size        Size, in bytes
* @param  creationCallback Callback, that executed on database creation. Accepts Database object.
*/

declare function openDatabase(name: string,
	version: string,
	displayname: string,
	size: number,
	creationCallback?: (database: Database) => void): Database;

interface Database {
	/**
	 * Starts new transaction.
	 * @param callback        Function, that will be called when transaction starts.
	 * @param errorCallback   Called, when Transaction fails.
	 * @param successCallback Called, when transaction committed.
	 */
	transaction(callback: (transaction: SqlTransaction) => void,
		errorCallback?: (error: SqlError) => void,
		successCallback?: () => void): void;
	/**
	 * Starts new transaction.
	 * @param callback        Function, that will be called when transaction starts.
	 * @param errorCallback   Called, when Transaction fails.
	 * @param successCallback Called, when transaction committed.
	 */
	readTransaction(callback: (transaction: SqlTransaction) => void,
		errorCallback?: (error: SqlError) => void,
		successCallback?: () => void): void;

	/**
	 * Upgrades the database schema
	 * @param oldVersion          Old version
	 * @param newVersion          New version
	 * @param transactionCallback Called, when Transaction ends.
	 * @param errorCallback       Called, when Transaction fails.
	 * @param successCallback     Called, when transaction committed.
	 */
	changeVersion(oldVersion: string,
		newVersion: string,
		transactionCallback: (t: SqlTransaction) => void,
		errorCallback?: (error: SqlError) => void,
		successCallback?: () => void): void;


	name: string;
	version: string;
	displayName: string;
	size: number;
}

interface SqlTransaction {
	/**
	 * Executes SQL statement via current transaction.
	 * @param sql SQL statement to execute.
	 * @param arguments SQL stetement arguments.
	 * @param successCallback Called in case of query has been successfully done.
	 * @param errorCallback   Called, when query fails. Return false to continue transaction; true or no return to rollback.
	 */
	executeSql(sql: string,
		arguments?: any[],
		successCallback?: (transaction: SqlTransaction, resultSet: SqlResultSet) => void,
		errorCallback?: (transaction: SqlTransaction, error: SqlError) => any): void;
}

interface SqlResultSet {
	readonly insertId: number;
	readonly rowsAffected: number;
	readonly rows: SqlResultSetRowList;
}

interface SqlResultSetRowList {
	readonly length: number;
	item(index: number): any;
}

interface SqlError {
	code: SqlErrorCode;
	message: string;
}

declare const enum SqlErrorCode {
	// Error code constants from http://www.w3.org/TR/webdatabase/#sqlerror
	UNKNOWN_ERR = 0,
	DATABASE_ERR,
	VERSION_ERR,
	TOO_LARGE_ERR,
	QUOTA_ERR,
	SYNTAX_ERR,
	CONSTRAINT_ERR,
	TIMEOUT_ERR
}