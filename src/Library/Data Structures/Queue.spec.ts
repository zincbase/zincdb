namespace ZincDB {
	describe("Data structures:", () => {
		describe("Queue:", () => {
			it("Enqueues a value", () => {
				const q = new Queue<number>();
				expect(q.length).toEqual(0)

				q.enqueue(1);

				expect(q.length).toEqual(1)

				q.enqueue(2);

				expect(q.length).toEqual(2)
				expect(q.dequeue()).toEqual(1);
				expect(q.length).toEqual(1)
				expect(q.dequeue()).toEqual(2);
				expect(q.length).toEqual(0)
				expect(q.dequeue()).toEqual(undefined);
				expect(q.length).toEqual(0)
				expect(q.isEmpty).toBe(true);
			});

			it("Dequeues all values", () => {
				const q = new Queue<number>();

				expect(q.dequeueAll()).toEqual([]);
				q.enqueue(1);
				q.enqueue(2);

				expect(q.dequeueAll()).toEqual([1,2]);
				expect(q.dequeueAll()).toEqual([]);
				expect(q.isEmpty).toBe(true);
			});
		});
	});
}
