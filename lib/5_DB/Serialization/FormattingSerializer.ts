namespace ZincDB {
	export namespace DB {
		export namespace FormattingSerializer {
			///////////////////////////////////////////////////////////////////////////////////////////////////
			/// Formatted data serialization
			///////////////////////////////////////////////////////////////////////////////////////////////////
			export function serializeFormattedData(bytes: Uint8Array, format: EntrySerializationFormat, encryptionKey?: string): Uint8Array {
				if (format === "jsonObject") {
					const parsedJSON: EntryObject<any> = JSON.parse(Encoding.UTF8.decode(bytes));

					if (typeof parsedJSON !== "object")
						throw new Error("Invalid data after parsing JSON: not an object");

					const objectAsEntries = EntrySerializer.objectToEntries(parsedJSON);

					return EntrySerializer.serializeEntries(objectAsEntries, encryptionKey);
				}
				else if (format === "jsonArray") {
					const parsedJSON: EntryArray<any> = JSON.parse(Encoding.UTF8.decode(bytes));

					if (!Array.isArray(parsedJSON))
						throw new Error("Invalid data after parsing JSON: not an array");

					return EntrySerializer.serializeEntries(parsedJSON, encryptionKey);
				}
				else if (format === "tabbedJson") {
					return tabbedJSONToSerializedEntries(bytes, encryptionKey);
				}
				else {
					throw new Error("Unsupported source format specified");
				}
			}

			///////////////////////////////////////////////////////////////////////////////////////////////////
			/// Tabbed JSON conversion operations
			///////////////////////////////////////////////////////////////////////////////////////////////////
			export function dbEntriesToTabbedJSON(entries: Entry<any>[]): string {
				let result = "";

				for (const entry of entries) {
					const metadata = entry.metadata || {};

					const timestampString = (metadata.updateTime || 0).toString();
					const keyString = JSON.stringify(entry.key);

					const valueString = Tools.stringifyJSONOrUndefined(entry.value);

					result += `${timestampString}\t${keyString}\t${valueString}\n`;
				}

				return result;
			}

			export function tabbedJSONToDBEntries(tabbedjson: string): Entry<any>[] {
				const serializedResultEntries = tabbedJSONToSerializedEntries(Encoding.UTF8.encode(tabbedjson));
				return EntrySerializer.deserializeEntries(serializedResultEntries);
			}

			export function tabbedJSONToSerializedEntries(bytes: Uint8Array, encryptionKey?: string): Uint8Array {
				let indexOf = (value: number, startOffset: number): number => {
					for (let i = startOffset, length = bytes.length; i < length; i++)
						if (bytes[i] === value)
							return i;

					return -1;
				}

				const serializedEntries: Uint8Array[] = [];

				let lineStartOffset = 0;

				while (lineStartOffset < bytes.length) {
					// Skip blank lines
					if (bytes[lineStartOffset] === 10) {
						lineStartOffset += 1;
						continue;
					}

					const firstTabPosition = indexOf(9, lineStartOffset);
					if (firstTabPosition === -1)
						throw new Error(`serializeTabbedJSONEntriesBytes: invalid entry detected at position ${lineStartOffset}, could not find the first tab separator.`);

					const secondTabPosition = indexOf(9, firstTabPosition + 1);
					if (secondTabPosition === -1)
						throw new Error(`serializeTabbedJSONEntriesBytes: invalid entry detected at position ${lineStartOffset}, could not find the second tab separator.`);

					const lineEndingPosition = indexOf(10, secondTabPosition + 1);
					if (lineEndingPosition === -1)
						throw new Error(`serializeTabbedJSONEntriesBytes: unterminated entry detected at position ${lineStartOffset}, could not find a new line seperator.`);

					const timestamp: number = parseInt(Encoding.UTF8.decode(bytes.subarray(lineStartOffset, firstTabPosition)));

					let keyBytes = bytes.subarray(firstTabPosition + 1, secondTabPosition);
					let valueBytes = bytes.subarray(secondTabPosition + 1, lineEndingPosition);

					let encryptionMethod = 0;

					if (encryptionKey) {
						encryptionMethod = 1;
						[keyBytes, valueBytes] = EntrySerializer.encryptKeyAndValueBytes(keyBytes, valueBytes, encryptionKey);
					}

					const serializedHeader = EntrySerializer.serializeHeader({
						totalSize: EntryHeaderSize + keyBytes.length + valueBytes.length,
						updateTime: timestamp,
						commitTime: timestamp,
						keySize: keyBytes.length,
						keyEncoding: DataEncoding.Json,
						valueEncoding: DataEncoding.Json,
						encryptionMethod: encryptionMethod,
						flags: EntryFlags.None,
						secondaryHeaderSize: 0
					})

					const serializedEntry = ArrayTools.concatUint8Arrays([serializedHeader, keyBytes, valueBytes]);

					serializedEntries.push(serializedEntry);

					lineStartOffset = lineEndingPosition + 1;
				}

				return ArrayTools.concatUint8Arrays(serializedEntries);
			}
		}
	}
}
