namespace ZincDB {
	export namespace DB {
		export type NodePath = Keypath.NodePath;
		export type EntityPath = Keypath.EntityPath;
		export type PathEntry = { path: NodePath, value: any, metadata?: EntryMetadata };
		export type PathEntries = PathEntry[];
		export type ConflictHandler = (conflictInfo: ConflictInfo) => Promise<any>;

		export type EntryObject<V> = { [key: string]: Entry<V> };
		export type EntryArray<V> = Array<Entry<V>>;
		export type ValueObject<V> = { [key: string]: V };
		export type ValueComparer<V> = (value1: V, value2: V) => number;
		export type StorageMedium = "InMemory" | "OnDisk" | "IndexedDB" | "WebSQL" | "SQLite" | "LevelDB" | "LocalStorage" | "SessionStorage"

		export type LocalDBOptions = {
			storageMedium: StorageMedium | StorageMedium[];
			remoteSyncURL: string;
			remoteAccessKey: string;
			encryptionKey?: string;
			useWorker: boolean;
			pullAfterOpened: boolean;
			webWorkerURI?: string;
			verifyServerCertificate?: boolean;
			storagePath?: string;
			requestTimeout?: number;
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

		export type SubscriberEventObject = {
			origin: "local" | "remote",
			changes: PathEntries,
			newValue?: any
		}

		export type SubscriberHandler = (changes: SubscriberEventObject) => void;
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
		export type DeleteOperation = { type: OperationType.Delete, path: EntityPath };
		export type UpdateOperation = { type: OperationType.Update, path: EntityPath, value: any };
		export type TransactionOperation = PutOperation | DeleteOperation | UpdateOperation;
		export type Transaction = TransactionOperation[];
	}
}
