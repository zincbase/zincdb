namespace ZincDB {
	export namespace DB {
		export class LocalDBTransaction {
			transaction: Transaction = [];
			transactionCommited: boolean = false;

			constructor(private readonly containerDB: LocalDB) {
			}

			put(path: NodePath | string, value: any): void
			put(...args: any[]) {
				if (args.length !== 2)
					throw new Error("Expected exactly two arguments.");

				if (this.transactionCommited)
					throw new Error("Transaction has already been commited.");

				if (this.containerDB.isClosed)
					throw new Error("Database has been closed.");

				const path = LocalDBOperations.verifyAndNormalizeNodePath(args[0], true);
				const value = args[1];

				this.transaction.push({ type: OperationType.Put, path, value });
			}

			delete(path: NodePath | string) {
				if (this.transactionCommited)
					throw new Error("Transaction has already been commited.");

				if (this.containerDB.isClosed)
					throw new Error("Database has been closed.");

				path = LocalDBOperations.verifyAndNormalizeNodePath(path, true);

				this.transaction.push({ type: OperationType.Delete, path });
			}
			
			update(path: NodePath | string, newValue: any): void
			update(...args: any[]): void {
				if (args.length !== 2)
					throw new Error("Expected exactly two arguments.");

				if (this.transactionCommited)
					throw new Error("Transaction has already been commited.");

				if (this.containerDB.isClosed)
					throw new Error("Database has been closed.");
				
				const path = LocalDBOperations.verifyAndNormalizeNodePath(args[0], false);
				const value = args[1];

				this.transaction.push({ type: OperationType.Update, path, value });
			}

			addListItem(listPath: NodePath | string, value: any): string {
				if (this.transactionCommited)
					throw new Error("Transaction has already been commited.");

				if (this.containerDB.isClosed)
					throw new Error("Database has been closed.");
				
				listPath = LocalDBOperations.verifyAndNormalizeNodePath(listPath, false);

				const itemKey = randKey();
				this.transaction.push({ type: OperationType.Put, path: [...listPath, itemKey], value });

				return itemKey;
			}

			async commit() {
				this.transactionCommited = true;
				return this.containerDB.commitLocalTransaction(this.transaction);
			}
		}
	}
}