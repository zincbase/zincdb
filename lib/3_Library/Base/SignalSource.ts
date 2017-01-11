/// <reference path="../Scheduling/EventLoop.ts"/>

namespace ZincDB {
	export class SignalSource {
		private subscribedHandlers: Action[] = [];

		async signal(): Promise<void> {
			for (const handler of this.subscribedHandlers) {
				await PromiseX.yield();
				handler();
			}
		}

		subscribe(handler: Action) {
			this.subscribedHandlers.push(handler);
		}

		unsubscribe(handler: Action) {
			const index = this.subscribedHandlers.indexOf(handler);

			if (index >= 0)
				this.subscribedHandlers.splice(index);
		}
	}
}