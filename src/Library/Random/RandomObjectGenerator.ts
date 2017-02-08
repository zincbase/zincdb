namespace ZincDB {
	export namespace RandomObject {
		const enum EntityType { Object, Array, Atom }
		const enum AtomType { Number, String, Boolean, Null, ArrayBuffer, Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array, Date, RegExp }

		export const generate = function (maxPropCount: number, maxDepth: number, rand: RandomGenerator = new JSRandom()): any {
			const randArrayBuffer = (maxLength: number, multiple = 1) => rand.getBytes(rand.getIntegerUpTo(maxLength) * multiple).buffer;

			const entityType: EntityType = rand.getIntegerUpTo(2);

			let result: any;
			switch(entityType) {
				case EntityType.Object:
					result = {};

					if (maxDepth === 0)
						return result;

					const propCount = rand.getIntegerUpTo(maxPropCount);

					for (let i = 0; i < propCount; i++) {
						result[rand.getUTF16String(rand.getIntegerInRange(1, 20))] = generate(maxPropCount, maxDepth - 1, rand);
					}
					return result;
				case EntityType.Array:
					result = [];

					if (maxDepth === 0)
						return result;

					const elementCount = rand.getIntegerUpTo(maxPropCount);

					for (let i = 0; i < elementCount; i++) {
						result.push(generate(maxPropCount, maxDepth - 1, rand));
					}

					return result;
				case EntityType.Atom:
					const atomType: AtomType = rand.getIntegerUpTo(14);

					switch (atomType) {
						case AtomType.Number:
							return rand.getFloatInRange(Number.MIN_VALUE, Number.MAX_VALUE);
						case AtomType.String:
							return rand.getUTF16String(rand.getIntegerUpTo(20))
						case AtomType.Boolean:
							return rand.getIntegerUpTo(1) === 1;
						case AtomType.Null:
							return null;
						case AtomType.ArrayBuffer:
							return randArrayBuffer(20);
						case AtomType.Int8Array:
							return new Int8Array(randArrayBuffer(20, 1));
						case AtomType.Uint8Array:
							return new Uint8Array(randArrayBuffer(20, 1));
						case AtomType.Int16Array:
							return new Int16Array(randArrayBuffer(20, 2));
						case AtomType.Uint16Array:
							return new Uint16Array(randArrayBuffer(20, 2));
						case AtomType.Int32Array:
							return new Int32Array(randArrayBuffer(20, 4));
						case AtomType.Uint32Array:
							return new Uint32Array(randArrayBuffer(20, 4));
						case AtomType.Float32Array:
							result = new Float32Array(rand.getIntegerUpTo(20));

							for (let i=0; i< result.length; i++)
								result = rand.getFloatInRange(Number.MIN_VALUE, Number.MAX_VALUE);

							return result;
						case AtomType.Float64Array:
							result = new Float64Array(rand.getIntegerUpTo(20));

							for (let i = 0; i < result.length; i++)
								result = rand.getFloatInRange(Number.MIN_VALUE, Number.MAX_VALUE);

							return result;
						case AtomType.Date:
							return new Date(rand.getIntegerUpTo(2 ** 50));
						case AtomType.RegExp: // Needs more work
							return /^Hello World!$/gi;
						default:
							throw new Error(`Invalid atom type: ${atomType}`);
					}

				default:
					throw new Error(`Invalid antity type: ${entityType}`);
			}
		}
	}
}
