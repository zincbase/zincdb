namespace ZincDB {
	export namespace DB {
		export class LocalDBTransaction {
			transaction: Transaction = [];
			transactionCommited: boolean = false;

			constructor(private readonly containerDB: LocalDB) {
			}

			put(path: NodePath, value: any) {
				if (this.transactionCommited)
					throw new Error("Transaction has already been commited.");

				if (this.containerDB.isClosed)
					throw new Error("Database has been closed.");

				LocalDBOperations.validateNodePath(path, true);

				if (value === undefined)
					throw new TypeError(`An undefined value supplied. To delete nodes please use the delete() method instead.`);

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

			update(path: NodePath, value: any) {
				if (this.transactionCommited)
					throw new Error("Transaction has already been commited.");

				if (this.containerDB.isClosed)
					throw new Error("Database has been closed.");

				LocalDBOperations.validateNodePath(path, true);

				this.transaction.push({ type: OperationType.Update, path, value });
			}

			addListItem(listPath: NodePath, value: any): string {
				if (this.transactionCommited)
					throw new Error("Transaction has already been commited.");

				if (this.containerDB.isClosed)
					throw new Error("Database has been closed.");

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