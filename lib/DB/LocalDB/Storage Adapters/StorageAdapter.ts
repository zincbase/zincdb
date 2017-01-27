namespace ZincDB {
	export namespace DB {
		export interface StorageAdapter {
			open(): Promise<void>;

			createObjectStoresIfNeeded(objectStoreNames: string[]): Promise<void>;

			deleteObjectStores(objectStoreNames: string[]): Promise<void>;

			clearObjectStores(objectStoreNames: string[]): Promise<void>;

			getObjectStoreNames(): Promise<string[]>;

			set(transactionObject: { [objectStoreName: string]: { [key: string]: Entry<any> | null } }): Promise<void>

			get<V>(key: string, objectStoreName: string): Promise<Entry<V>>
			get<V>(keys: string[], objectStoreName: string): Promise<Entry<V>[]>

			has(key: string, objectStoreName: string): Promise<boolean>
			has(keys: string[], objectStoreName: string): Promise<boolean[]>

			getAll<V>(objectStoreName: string): Promise<Entry<V>[]>

			getAllKeys(objectStoreName: string): Promise<string[]>

			count(filter: any, objectStoreName: string): Promise<number>

			createIterator(objectStoreName: string,
				indexName: string | undefined,
				options: { [key: string]: any },
				onIteration: (result: Entry<any>, transactionContext?: any) => Promise<void>
			): Promise<void>

			close(): Promise<void>

			destroy(): Promise<void>

			isOpen: boolean
		}
	}
}
