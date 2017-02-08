namespace ZincDB {
	export interface DispatcherSchema { [name: string]: { Args: any[]; ReturnValue: any } };

	export interface Dispatcher<Schema extends DispatcherSchema> {
		exec<K extends keyof Schema>(target: string, name: K, args: Schema[K]['Args'], options?: object): Promise<Schema[K]['ReturnValue']>;
	}
}
