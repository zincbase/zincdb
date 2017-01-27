namespace ZincDB {
	export namespace DB {
		export class LocalDBTransaction {
			transaction: Transaction = [];
			commited: boolean = false;

			constructor(private readonly containingDB: LocalDB) {
			}

			put(path: NodePath | string, value: any): this
			put(...args: any[]): this {
				if (args.length !== 2)
					throw new Error("Expected exactly two arguments.");

				if (this.commited)
					throw new Error("Transaction has already been commited.");

				if (this.containingDB.isClosed)
					throw new Error("Database has been closed.");

				const path = LocalDBOperations.verifyAndNormalizeNodePath(args[0], true);
				const value = args[1];

				this.transaction.push({ type: OperationType.Put, path, value });

				return this;
			}

			delete(path: EntityPath | string): this {
				if (this.commited)
					throw new Error("Transaction has already been commited.");

				if (this.containingDB.isClosed)
					throw new Error("Database has been closed.");

				path = LocalDBOperations.verifyAndNormalizeEntityPath(path);

				this.transaction.push({ type: OperationType.Delete, path });

				return this;
			}

			update(path: EntityPath | string, newValue: any): this
			update(...args: any[]): this {
				if (args.length !== 2)
					throw new Error("Expected exactly two arguments.");

				if (this.commited)
					throw new Error("Transaction has already been commited.");

				if (this.containingDB.isClosed)
					throw new Error("Database has been closed.");

				const path = LocalDBOperations.verifyAndNormalizeEntityPath(args[0]);
				const value = args[1];

				this.transaction.push({ type: OperationType.Update, path, value });

				return this;
			}

			appendListItem(listPath: NodePath | string, value: any): this {
				return this.addListItem(listPath, value, { chain: true });
			}

			addListItem(listPath: NodePath | string, value: any, options?: { chain?: false }): string;
			addListItem(listPath: NodePath | string, value: any, options: { chain: true }): this;
			addListItem(listPath: NodePath | string, value: any, options?: { chain?: boolean }): string | this {
				if (this.commited)
					throw new Error("Transaction has already been commited.");

				if (this.containingDB.isClosed)
					throw new Error("Database has been closed.");

				listPath = LocalDBOperations.verifyAndNormalizeNodePath(listPath, false);

				const itemKey = randKey();
				this.transaction.push({ type: OperationType.Put, path: [...listPath, itemKey], value });

				if (options && options.chain === true)
					return this;
				else
					return itemKey;
			}

			async commit(): Promise<void> {
				this.commited = true;
				return this.containingDB.commitLocalTransaction(this.transaction);
			}
		}
	}
}