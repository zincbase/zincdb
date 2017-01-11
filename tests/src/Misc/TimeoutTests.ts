namespace ZincDB {
	export class TimeoutTests {
		static testSetImmediate() {
			//const records = [];
			const timer = new Timer();
			let count = 0;

			let iterate = () => {
				count++;
				if (timer.getElapsedTime() < 10000) {
					setImmediate(() => iterate());
				}
				else {
					log(timer.getElapsedTime());
					log(count);
				}
			}

			iterate();
		}

		static testTimeout() {
			const results: any[] = [];
			const globalTimer = new Timer();

			let iterate = () => {
				const timer = new Timer();
				setTimeout(() => {
					results.push(timer.getElapsedTime());

					if (globalTimer.getElapsedTime() < 1000)
						iterate();
					else
						log(results);
				}, 2);
			}

			iterate();
		}
	}
}