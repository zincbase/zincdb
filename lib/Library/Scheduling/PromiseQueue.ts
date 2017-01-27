namespace ZincDB {
	export type StarterFunc<R> = () => R | PromiseLike<R>;
	type TaskQueueEntry = [StarterFunc<any>, OpenPromise<any>]

	export class PromiseQueue {
		private pendingTasks: Queue<TaskQueueEntry> = new Queue<TaskQueueEntry>();
		private isIdle: boolean = true;

		add<R>(starter: StarterFunc<R>): Promise<R> {
			const starterPromiseFunc = () => Promise.resolve().then(starter);
			const completionPromise = new OpenPromise<R>();

			if (this.isIdle)
				this.startPromiseFunc(starterPromiseFunc, completionPromise);
			else
				this.pendingTasks.enqueue([starterPromiseFunc, completionPromise]);

			return completionPromise;
		}

		private startPendingTask() {
			if (!this.pendingTasks.isEmpty) {
				const [starterFunc, completionPromise] = <any> this.pendingTasks.dequeue();

				this.startPromiseFunc(starterFunc, completionPromise);
			}
			else {
				this.isIdle = true;
			}
		}

		private startPromiseFunc(promiseFunc: StarterFunc<any>, completionPromise: OpenPromise<any>) {
			let newTaskPromise: Promise<any>;

			try {
				newTaskPromise = promiseFunc();
			}
			catch (e) {
				if (!(e.name === "PromiseCanceledError"))
					printExceptionAndStackTraceToConsole(e, "Promise queue error");
				
				completionPromise.reject(e);
				this.startPendingTask();

				return;
			}
			
			this.isIdle = false;

			newTaskPromise.then((result) => {
				completionPromise.resolve(result);
				this.startPendingTask();
			}, (e) => {
				completionPromise.reject(e);
				this.startPendingTask();
			});
		}

		get pendingPromiseCount(): number {
			return this.pendingTasks.length;
		}
	}
}