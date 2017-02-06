namespace ZincDB {
	export namespace DB {
		export interface Entry<V> {
			key: string;
			value: V;
			metadata: EntryMetadata;
		}

		export interface EntryMetadata {
			updateTime?: number;
			commitTime?: number;
			syncReferenceTime?: number;
			isHeadEntry?: boolean;
		}
	}

	export class EntryCorruptedError extends Error { };
}
