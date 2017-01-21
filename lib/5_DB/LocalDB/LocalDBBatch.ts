namespace ZincDB {
	export namespace DB {
		export class LocalDBBatch {
			batch: Batch = [];
			batchCommited: boolean = false;

			constructor(private readonly containingDB: LocalDB) {
			}

			put(path: NodePath | string, value: any): this
			put(...args: any[]): this {
				if (args.length !== 2)
					throw new Error("Expected exactly two arguments.");

				if (this.batchCommited)
					throw new Error("Transaction has already been commited.");

				if (this.containingDB.isClosed)
					throw new Error("Database has been closed.");

				const path = LocalDBOperations.verifyAndNormalizeNodePath(args[0], true);
				const value = args[1];

				this.batch.push({ type: OperationType.Put, path, value });

				return this;
			}

			delete(path: NodePath | string): this {
				if (this.batchCommited)
					throw new Error("Transaction has already been commited.");

				if (this.containingDB.isClosed)
					throw new Error("Database has been closed.");

				path = LocalDBOperations.verifyAndNormalizeNodePath(path, true);

				this.batch.push({ type: OperationType.Delete, path });

				return this;
			}

			update(path: NodePath | string, newValue: any): this
			update(...args: any[]): this {
				if (args.length !== 2)
					throw new Error("Expected exactly two arguments.");

				if (this.batchCommited)
					throw new Error("Transaction has already been commited.");

				if (this.containingDB.isClosed)
					throw new Error("Database has been closed.");

				const path = LocalDBOperations.verifyAndNormalizeNodePath(args[0], false);
				const value = args[1];

				this.batch.push({ type: OperationType.Update, path, value });

				return this;
			}

			appendListItem(listPath: NodePath | string, value: any): this {
				return this.addListItem(listPath, value, { chain: true });
			}

			addListItem(listPath: NodePath | string, value: any, options?: { chain?: false }): string;
			addListItem(listPath: NodePath | string, value: any, options: { chain: true }): this;
			addListItem(listPath: NodePath | string, value: any, options?: { chain?: boolean }): string | this {
				if (this.batchCommited)
					throw new Error("Transaction has already been commited.");

				if (this.containingDB.isClosed)
					throw new Error("Database has been closed.");

				listPath = LocalDBOperations.verifyAndNormalizeNodePath(listPath, false);

				const itemKey = randKey();
				this.batch.push({ type: OperationType.Put, path: [...listPath, itemKey], value });

				if (options && options.chain === true)
					return this;
				else
					return itemKey;
			}

			async write(): Promise<void> {
				this.batchCommited = true;
				return this.containingDB.commitLocalTransaction(this.batch);
			}
		}
	}
}