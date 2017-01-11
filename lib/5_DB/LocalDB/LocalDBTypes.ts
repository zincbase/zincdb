namespace ZincDB {
	export namespace DB {
		export type NodePath = string[];
		export type EntityPath = (string | number)[];
		export type PathEntry = { path: NodePath, value: any, metadata?: EntryMetadata };
		export type PathEntries = PathEntry[];
		export type ConflictHandler = (conflictInfo: ConflictInfo) => Promise<any>;

		export type EntryObject<V> = { [key: string]: Entry<V> };
		export type EntryArray<V> = Array<Entry<V>>;
		export type ValueObject<V> = { [key: string]: V };
		export type ValueComparer<V> = (value1: V, value2: V) => number;

		export type LocalDBOptions = {
			storageMedium: "InMemory" | "OnDisk" | "IndexedDB" | "WebSQL";
			remoteSyncURL: string;
			remoteAccessKey: string;
			encryptionKey?: string;
			useWebWorker: boolean;
			pullAfterOpened: boolean;
			workerURI?: string;
		}

		export type ConflictInfo = {
			key: string;
			path: NodePath;
			localValue: any;
			remoteValue: any;
			localUpdateTime: number;
			remoteUpdateTime: number;
			remoteCommitTime: number;
		}
		
		export type ChangesObject = { 
			origin: "local" | "remote", 
			revisions: PathEntries, 
			newValue?: any 
		}

		export type SubscriberHandler = (changes: ChangesObject) => void;
		export type Subscriber = {
			handler: SubscriberHandler;
			isObserver: boolean;
		}

		export type SubscriptionTarget = {
			pathString: string;
			path: EntityPath;
			subscribers: Subscriber[];
		}

		export const enum OperationType { Put, Delete, Update };
		export type PutOperation = { type: OperationType.Put, path: NodePath, value: any };
		export type DeleteOperation = { type: OperationType.Delete, path: NodePath };
		export type UpdateOperation = { type: OperationType.Update, path: EntityPath, value: any };
		export type TransactionOperation = PutOperation | DeleteOperation | UpdateOperation;
		export type Transaction = TransactionOperation[];
	}
}