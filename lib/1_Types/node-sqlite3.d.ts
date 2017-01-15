// Type definitions for sqlite3 2.2.3
// Project: https://github.com/mapbox/node-sqlite3
// Definitions by: Nick Malaguti <https://github.com/nmalaguti/>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

declare class NodeSQLiteDatabase extends events.EventEmitter {
    constructor(filename: string, callback?: (err: Error) => void);
    constructor(filename: string, mode?: number, callback?: (err: Error) => void);

    public close(callback?: (err: Error) => void): void;

    public run(sql: string, callback?: (err: Error) => void): Database;
    public run(sql: string, params: any, callback?: (err: Error) => void): Database;
    public run(sql: string, ...params: any[]): Database;

    public get(sql: string, callback?: (err: Error, row: any) => void): Database;
    public get(sql: string, params: any, callback?: (err: Error, row: any) => void): Database;
    public get(sql: string, ...params: any[]): Database;

    public all(sql: string, callback?: (err: Error, rows: any[]) => void): Database;
    public all(sql: string, params: any, callback?: (err: Error, rows: any[]) => void): Database;
    public all(sql: string, ...params: any[]): Database;

    public each(sql: string, callback?: (err: Error, row: any) => void, complete?: (err: Error, count: number) => void): Database;
    public each(sql: string, params: any, callback?: (err: Error, row: any) => void, complete?: (err: Error, count: number) => void): Database;
    public each(sql: string, ...params: any[]): Database;

    public exec(sql: string, callback?: (err: Error) => void): Database;

    public prepare(sql: string, callback?: (err: Error) => void): void;
    public prepare(sql: string, params: any, callback?: (err: Error) => void): void;
    public prepare(sql: string, ...params: any[]): void;

    public serialize(callback?: () => void): void;
    public parallelize(callback?: () => void): void;

    public on(event: "trace", listener: (sql: string) => void): this;
    public on(event: "profile", listener: (sql: string, time: number) => void): this;
    public on(event: "error", listener: (err: Error) => void): this;
    public on(event: "open", listener: () => void): this;
    public on(event: "close", listener: () => void): this;
    public on(event: string, listener: Function): this;
}
