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

	export type EntrySerializationFormat = "raw" | "jsonArray" | "jsonObject" | "tabbedJson" | "tabbedJsonShort";

	export class EntryCorruptionError extends Error { };
}