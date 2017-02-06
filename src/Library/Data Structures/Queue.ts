/// <reference path="List.ts"/>

namespace ZincDB {
	export class Queue<T> extends List<T>
	{
		constructor() {
			super();
		}

		enqueue(element: T) {
			this.add(element);
		}

		dequeue(): T | undefined {
			return this.removeFirst();
		}

		dequeueAll(): T[] {
			const dequeuedElements = this.elements.slice(0);
			this.clear();

			return dequeuedElements;
		}
	}
}
