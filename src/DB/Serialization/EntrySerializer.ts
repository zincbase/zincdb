namespace ZincDB {
	export namespace DB {
		export type EntryHeader = {
			// All fields are little-endian
			totalSize: number; // 64 bit unsigned integer
			headerVersion: number; // 16 bit unsigned integer
			keySize: number; // 16 bit unsigned integer
			keyEncoding: DataEncoding; // 8 bit unsigned integer
			valueEncoding: DataEncoding; // 8 bit unsigned integer
			encryptionMethod: EncryptionMethod; // 4 bit unsigned integer
			flags: EntryFlags; // 8 bit unsigned int
			updateTime: number; // 64 bit unsigned integer
			commitTime: number; // 64 bit unsigned integer
			headerChecksum: number // 32 bit unsigned integer
			payloadChecksum: number // 32 bit unsigned integer
		}

		export type ParsedEntry = {
			header: EntryHeader,
			entryBytes: Uint8Array
		}

		export const enum DataEncoding {
			Binary = 0,
			UTF8 = 1,
			Json = 2,
			OmniJson = 3,
		}

		export const enum EntryFlags {
			None = 0,
			TransactionEnd = 1,
			HeadEntry = 2
		}

		export const enum EncryptionMethod {
			None = 0,
			AES_CBC_128 = 1,
			AES_GCM_128 = 2
		}

		export const EntryHeaderByteSize = 40;
		export class NoDecryptionKeyError extends Error { };
		export class UnsupportedCipherError extends Error { };

		export namespace EntrySerializer {
			///////////////////////////////////////////////////////////////////////////////////////////////////
			/// Entry serialization
			///////////////////////////////////////////////////////////////////////////////////////////////////
			export const serializeEntries = function (entries: EntryArray<any>, encryptionKeyHex?: string, addChecksums = false): Uint8Array {
				if (entries == null)
					throw new TypeError("serializeEntries: entries are null or undefined");

				const serializedEntries: Uint8Array[] = [];

				for (let i = 0; i < entries.length; i++)
					serializedEntries.push(serializeEntry(entries[i], encryptionKeyHex, addChecksums));

				return ArrayTools.concatUint8Arrays(serializedEntries);
			}

			export const serializeEntry = function (entry: Entry<any>, encryptionKeyHex?: string, addChecksums = false): Uint8Array {
				if (entry == null)
					throw new TypeError("serializeEntry: entry is null or undefined");

				if (typeof entry.key !== "string")
					throw new TypeError("serializeEntry: entry has missing or invalid 'key' property");

				let keyBytes = Encoding.UTF8.encode(JSON.stringify(entry.key));
				let valueEncoding: DataEncoding;

				let valueBytes: Uint8Array;

				if (entry.value instanceof Uint8Array) {
					valueBytes = entry.value;
					valueEncoding = DataEncoding.Binary;
				}
				else if (ObjectTools.deepContainsOmniJsonEncodables(entry.value)) {
					valueBytes = Encoding.UTF8.encode(Encoding.OmniJson.encode(entry.value));
					valueEncoding = DataEncoding.OmniJson;
				}
				else {
					valueBytes = Encoding.UTF8.encode(Encoding.JsonX.encode(entry.value));
					valueEncoding = DataEncoding.Json;
				}

				let encryptionMethod: EncryptionMethod;

				if (encryptionKeyHex) {
					encryptionMethod = EncryptionMethod.AES_CBC_128;
					[keyBytes, valueBytes] = encryptKeyAndValueBytes(keyBytes, valueBytes, encryptionKeyHex);
				}
				else
					encryptionMethod = EncryptionMethod.None;

				const metadata = entry.metadata || {};

				const header: EntryHeader = {
					totalSize: EntryHeaderByteSize + keyBytes.length + valueBytes.length,
					headerVersion: 0,
					keySize: keyBytes.length,
					keyEncoding: DataEncoding.Json,
					valueEncoding: valueEncoding,
					encryptionMethod: encryptionMethod,
					flags: EntryFlags.None,
					updateTime: metadata.updateTime || 0,
					commitTime: metadata.commitTime || 0,
					headerChecksum: 0,
					payloadChecksum: 0,
				}

				const serializedHeader = serializeHeader(header);
				const serializedEntry = new Uint8Array(header.totalSize);

				serializedEntry.set(serializedHeader);
				serializedEntry.set(keyBytes, EntryHeaderByteSize);
				serializedEntry.set(valueBytes, EntryHeaderByteSize + keyBytes.length);

				if (addChecksums)
					EntrySerializer.addChecksumsToSerializedEntry(serializedEntry);

				return serializedEntry;
			}

			///////////////////////////////////////////////////////////////////////////////////////////////////
			/// Entry deserialization
			///////////////////////////////////////////////////////////////////////////////////////////////////
			export const deserializeFirstEntry = function (bytes: Uint8Array, decryptionKeyHex?: string, verifyChecksums = false): Entry<any> {
				const [header, entryBytes] = deserializeHeaderAndValidateEntryBytes(bytes, verifyChecksums);
				const entry = deserializeEntryBody(entryBytes, header, decryptionKeyHex);

				return entry;
			}

			export const deserializeEntries = function (bytes: Uint8Array, decryptionKeyHex?: string, verifyChecksums = false): EntryArray<any> {
				if (bytes == null)
					throw new TypeError("deserializeEntries: input is null or undefined");

				if (!(bytes instanceof Uint8Array))
					throw new TypeError("deserializeEntries: input is not a Uint8Array");

				const deserializedEntries: EntryArray<any> = [];

				while (bytes.length > 0) {
					const [header, entryBytes] = deserializeHeaderAndValidateEntryBytes(bytes, verifyChecksums);
					const deserializedEntry = deserializeEntryBody(entryBytes, header, decryptionKeyHex);

					deserializedEntries.push(deserializedEntry);

					bytes = bytes.subarray(header.totalSize);
				}

				return deserializedEntries;
			}

			export const compactAndDeserializeEntries = function (bytes: Uint8Array, decryptionKeyHex?: string, verifyChecksums = false): EntryArray<any> {
				if (bytes == null)
					throw new TypeError("deserializeEntries: input is null or undefined");

				if (!(bytes instanceof Uint8Array))
					throw new TypeError("deserializeEntries: input is not a Uint8Array");

				type SerializedEntry = { offset: number, header: EntryHeader, entryBytes: Uint8Array };
				const compactionMap = new StringMap<SerializedEntry>();

				let offset = 0;

				while (bytes.length > 0) {
					const [header, entryBytes] = deserializeHeaderAndValidateEntryBytes(bytes, verifyChecksums);
					const keyStartOffset = EntryHeaderByteSize;

					const keyBytes = entryBytes.subarray(keyStartOffset, keyStartOffset + header.keySize);
					compactionMap.set(Encoding.Hex.encode(keyBytes), { offset: offset, header: header, entryBytes: entryBytes });

					bytes = bytes.subarray(header.totalSize);
					offset += header.totalSize;
				}

				const compactedSerializedEntries: SerializedEntry[] = [];
				compactionMap.forEach((value) => compactedSerializedEntries.push(value));
				compactedSerializedEntries.sort((a, b) => a.offset - b.offset)

				const deserializedEntries: EntryArray<any> = [];

				for (const serializedEntry of compactedSerializedEntries) {
					const deserializedEntry = deserializeEntryBody(serializedEntry.entryBytes, serializedEntry.header, decryptionKeyHex);
					deserializedEntries.push(deserializedEntry);
				}

				return deserializedEntries;
			}

			export const deserializeEntryBody = function (entryBytes: Uint8Array, header: EntryHeader, decryptionKeyHex?: string): Entry<any> {
				const keyStartOffset = EntryHeaderByteSize;
				let keyBytes = entryBytes.subarray(keyStartOffset, keyStartOffset + header.keySize);
				let valueBytes = entryBytes.subarray(keyStartOffset + header.keySize);

				if (header.encryptionMethod !== EncryptionMethod.None) {
					if (header.encryptionMethod !== EncryptionMethod.AES_CBC_128)
						throw new UnsupportedCipherError("An encrypted entry was encountered but with an unsuported cipher.");

					if (decryptionKeyHex == null)
						throw new NoDecryptionKeyError("An encrypted entry was encountered but no decryption key has been specified.");

					[keyBytes, valueBytes] = decryptKeyAndValueBytes(keyBytes, valueBytes, decryptionKeyHex);
				}

				const [key, value] = deserializeKeyAndValueToEncoding(keyBytes, valueBytes, header.keyEncoding, header.valueEncoding);

				return { key: key, value: value, metadata: headerToMetadata(header) }
			}

			export const deserializeKeyAndValueToEncoding = function (keyBytes: Uint8Array, valueBytes: Uint8Array, keyEncoding: DataEncoding, valueEncoding: DataEncoding): [any, any] {
				if (keyBytes == null || valueBytes == null)
					throw new TypeError("deserializeBytesToEncoding: input is null or undefined");

				let key: any;
				let value: any;

				switch (keyEncoding) {
					case DataEncoding.Binary:
						key = Encoding.Base64.encode(keyBytes);
						break;
					case DataEncoding.UTF8:
						key = Encoding.UTF8.decode(keyBytes);
						break;
					case DataEncoding.Json:
						key = Encoding.JsonX.decode(Encoding.UTF8.decode(keyBytes));
						break;
					case DataEncoding.OmniJson:
						key = Encoding.OmniJson.decode(Encoding.UTF8.decode(keyBytes));
						break;
					default:
						throw new TypeError(`deserializeKeyAndValueToEncoding: invalid key encoding '${keyEncoding}'`);
				}

				switch (valueEncoding) {
					case DataEncoding.Binary:
						value = valueBytes;
						break;
					case DataEncoding.UTF8:
						value = Encoding.UTF8.decode(valueBytes);
						break;
					case DataEncoding.Json:
						value = Encoding.JsonX.decode(Encoding.UTF8.decode(valueBytes));
						break;
					case DataEncoding.OmniJson:
						value = Encoding.OmniJson.decode(Encoding.UTF8.decode(valueBytes));
						break;
					default:
						throw new TypeError(`deserializeKeyAndValueToEncoding: invalid value encoding '${valueEncoding}'`);
				}

				return [key, value];
			}

			export const deserializeHeaderAndValidateEntryBytes = function (bytes: Uint8Array, verifyChecksums: boolean): [EntryHeader, Uint8Array] {
				if (bytes.length < EntryHeaderByteSize)
					throw new EntryCorruptedError("Bytes has length shorter than primary header size, this may be due to corruption");

				const header = deserializeHeader(bytes);

				if (header.totalSize < EntryHeaderByteSize)
					throw new EntryCorruptedError("Entry has length shorter than primary header size, this may be due to corruption");

				if (header.totalSize > bytes.length)
					throw new EntryCorruptedError("Entry has a longer length than bytes given");

				const entryBytes = bytes.subarray(0, header.totalSize);

				if (verifyChecksums)
					EntrySerializer.verifyChecksumsInSerializedEntry(entryBytes)

				return [header, entryBytes];
			}

			///////////////////////////////////////////////////////////////////////////////////////////////////
			/// Encryption and decryption of keys and values
			///////////////////////////////////////////////////////////////////////////////////////////////////
			export const encryptKeyAndValueBytes = function (keyBytes: Uint8Array, valueBytes: Uint8Array, encryptionKeyHex: string): [Uint8Array, Uint8Array] {
				const encryptedKeyBytes = Crypto.AES_CBC.encrypt(keyBytes, encryptionKeyHex, Crypto.AES_CBC.zeroBlock);

				let encryptedValueBytes: Uint8Array;

				if (valueBytes.length > 0) {
					let iv = Crypto.Random.getBytes(16);
					const encryptedValueBytesWithoutIV = Crypto.AES_CBC.encrypt(valueBytes, encryptionKeyHex, iv);
					encryptedValueBytes = ArrayTools.concatUint8Arrays([iv, encryptedValueBytesWithoutIV]);
				}
				else
					encryptedValueBytes = new Uint8Array(0);

				return [encryptedKeyBytes, encryptedValueBytes];
			}

			export const decryptKeyAndValueBytes = function (encryptedKeyBytes: Uint8Array, encryptedValueBytes: Uint8Array, decryptionKeyHex: string): [Uint8Array, Uint8Array] {
				const decryptedKeyBytes = Crypto.AES_CBC.decrypt(encryptedKeyBytes, decryptionKeyHex, Crypto.AES_CBC.zeroBlock);
				let decryptedValueBytes: Uint8Array;

				if (encryptedValueBytes.length > 0) {
					let iv = encryptedValueBytes.subarray(0, 16);
					decryptedValueBytes = Crypto.AES_CBC.decrypt(encryptedValueBytes.subarray(16), decryptionKeyHex, iv);
				}
				else
					decryptedValueBytes = new Uint8Array(0);

				return [decryptedKeyBytes, decryptedValueBytes];
			}

			///////////////////////////////////////////////////////////////////////////////////////////////////
			/// Header serialization and deserialization
			///////////////////////////////////////////////////////////////////////////////////////////////////
			export const serializeHeader = function (header: EntryHeader): Uint8Array {
				const headerBytes = new Uint8Array(EntryHeaderByteSize);
				const dataView = new DataView(headerBytes.buffer);

				// Total size field
				const totalSizeLow = (header.totalSize >>> 0);
				const totalSizeHigh = (header.totalSize - totalSizeLow) / 4294967296

				dataView.setUint32(0, totalSizeLow, true);
				dataView.setUint32(4, totalSizeHigh, true);

				dataView.setUint16(8, header.headerVersion, true);
				dataView.setUint16(10, header.keySize, true);
				dataView.setUint8(12, header.keyEncoding);
				dataView.setUint8(13, header.valueEncoding);
				dataView.setUint8(14, header.encryptionMethod);
				dataView.setUint8(15, header.flags);

				// Update time field
				const updateTimeLow = (header.updateTime >>> 0);
				const updateTimeHigh = (header.updateTime - updateTimeLow) / 4294967296

				dataView.setUint32(16, updateTimeLow, true);
				dataView.setUint32(20, updateTimeHigh, true);

				// Commit time field
				const commitTimeLow = (header.commitTime >>> 0);
				const commitTimeHigh = (header.commitTime - commitTimeLow) / 4294967296

				dataView.setUint32(24, commitTimeLow, true);
				dataView.setUint32(28, commitTimeHigh, true);

				dataView.setUint32(32, header.headerChecksum, true);
				dataView.setUint32(36, header.payloadChecksum, true);

				return headerBytes;
			}

			export const deserializeHeader = function (headerBytes: Uint8Array): EntryHeader {
				const header: EntryHeader = <any>{};
				const dataView = new DataView(headerBytes.buffer, headerBytes.byteOffset, headerBytes.byteLength);

				//
				header.totalSize = dataView.getUint32(0, true) + (dataView.getUint32(4, true) * 4294967296);

				header.headerVersion = dataView.getUint16(8, true);
				header.keySize = dataView.getUint16(10, true);
				header.keyEncoding = dataView.getUint8(12);
				header.valueEncoding = dataView.getUint8(13);
				header.encryptionMethod = dataView.getUint8(14);
				header.flags = dataView.getUint8(15);

				header.updateTime = dataView.getUint32(16, true) + (dataView.getUint32(20, true) * 4294967296);
				header.commitTime = dataView.getUint32(24, true) + (dataView.getUint32(28, true) * 4294967296);

				header.headerChecksum = dataView.getUint32(32, true);
				header.payloadChecksum = dataView.getUint32(36, true);

				return header;
			}

			export const headerToMetadata = function (header: EntryHeader): EntryMetadata {
				const metadata: EntryMetadata = {}

				metadata.updateTime = header.updateTime || 0;
				if (header.commitTime)
					metadata.commitTime = header.commitTime;

				if ((header.flags & EntryFlags.HeadEntry) === EntryFlags.HeadEntry)
					metadata.isHeadEntry = true;

				return metadata;
			}

			///////////////////////////////////////////////////////////////////////////////////////////////////
			/// Checksum operations
			///////////////////////////////////////////////////////////////////////////////////////////////////
			export const addChecksumsToSerializedEntry = function (entryBytes: Uint8Array) {
				const dataView = new DataView(entryBytes.buffer, entryBytes.byteOffset, entryBytes.byteLength);
				const headerChecksum = Hashing.CRC32C.getChecksum(entryBytes.subarray(0, 32));
				const payloadChecksum = Hashing.CRC32C.getChecksum(entryBytes.subarray(40));

				dataView.setInt32(32, headerChecksum, true);
				dataView.setInt32(36, payloadChecksum, true);
			}

			export const verifyChecksumsInSerializedEntry = function (entryBytes: Uint8Array): boolean {
				const dataView = new DataView(entryBytes.buffer, entryBytes.byteOffset, entryBytes.byteLength);
				const headerChecksum = Hashing.CRC32C.getChecksum(entryBytes.subarray(0, 32));
				const payloadChecksum = Hashing.CRC32C.getChecksum(entryBytes.subarray(40));

				const expectedHeaderChecksum = dataView.getInt32(32, true);
				const expectedPayloadChecksum = dataView.getInt32(36, true);

				return headerChecksum === expectedHeaderChecksum && payloadChecksum === expectedPayloadChecksum;
			}

			///////////////////////////////////////////////////////////////////////////////////////////////////
			/// Entry array to object conversion
			///////////////////////////////////////////////////////////////////////////////////////////////////
			export const entriesToObject = function <R>(entries: EntryArray<any>): R {
				const result = {};

				for (const entry of entries) {
					result[entry.key] = entry.value;
				}

				return <R>result;
			}

			export const objectToEntries = function (obj: any): EntryArray<any> {
				const results: EntryArray<any> = [];

				for (const key in obj)
					results.push({ key: key, value: obj[key], metadata: {} });

				return results;
			}
		}
	}
}
