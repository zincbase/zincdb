namespace ZincDB {
	export namespace DB {
		export class LocalDBTransaction {
			transaction: Transaction = [];
			transactionCommited: boolean = false;

			constructor(private readonly containerDB: LocalDB) {
			}

			put(path: NodePath, value: any): void
			put(...args: any[]) {
				if (args.length !== 2)
					throw new Error("Expected exactly two arguments.");

				if (this.transactionCommited)
					throw new Error("Transaction has already been commited.");

				if (this.containerDB.isClosed)
					throw new Error("Database has been closed.");

				const [path, value] = <[NodePath, any]> args;
				LocalDBOperations.validateNodePath(path, true);

				this.transaction.push({ type: OperationType.Put, path, value });
			}

			delete(path: NodePath) {
				if (this.transactionCommited)
					throw new Error("Transaction has already been commited.");

				if (this.containerDB.isClosed)
					throw new Error("Database has been closed.");

				LocalDBOperations.validateNodePath(path, true);

				this.transaction.push({ type: OperationType.Delete, path });
			}
			
			update(path: NodePath, newValue: any): void
			update(...args: any[]): void {
				if (args.length !== 2)
					throw new Error("Expected exactly two arguments.");

				if (this.transactionCommited)
					throw new Error("Transaction has already been commited.");

				if (this.containerDB.isClosed)
					throw new Error("Database has been closed.");
				
				const [path, value] = <[NodePath, any]> args;
				LocalDBOperations.validateNodePath(path, false);

				this.transaction.push({ type: OperationType.Update, path, value });
			}

			addListItem(listPath: NodePath, value: any): string {
				if (this.transactionCommited)
					throw new Error("Transaction has already been commited.");

				if (this.containerDB.isClosed)
					throw new Error("Database has been closed.");
				
				LocalDBOperations.validateNodePath(listPath, false);

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