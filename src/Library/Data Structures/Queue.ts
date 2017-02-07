namespace ZincDB {
	export class Queue<T>
	{
		elements: T[] = [];

		enqueue(element: T) {
			this.elements.push(element);
		}

		dequeue(): T | undefined {
			return this.elements.shift();
		}

		dequeueAll(): T[] {
			const dequeuedElements = this.elements.slice(0);
			this.elements.length = 0;

			return dequeuedElements;
		}

		get length():number {
			return this.elements.length;
		}

		get isEmpty(): boolean {
			return this.length === 0;
		}
	}
}
