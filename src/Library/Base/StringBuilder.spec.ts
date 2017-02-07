namespace ZincDB {
	describe("Base:", () => {
		describe("StringBuilder:", () => {
			it("Builds a string containing unicode characters with code up to 65535", () => {
				let str = "";

				for (let i = 0; i < 5; i++)
					str += "新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬先生批評封神演義新刻鐘伯敬";

				const stringBuilder = new StringBuilder();

				for (let i = 0; i < str.length; i++)
					stringBuilder.appendCharCode(str.charCodeAt(i));

				expect(stringBuilder.getOutputString()).toEqual(str);
			});

			it("Builds a string containing random unicode characters, including ones having non-BMP codepoints", () => {
				const rand = new SeededRandom();

				let str = "";
				const codePoints: number[] = [];

				for (let i = 0; i < 100; i++) {
					const randomCodePoint = rand.getCodePoint();

					codePoints.push(randomCodePoint);
					str += Encoding.CodePoint.decodeToString(randomCodePoint);
				}

				const stringBuilder = new StringBuilder();

				codePoints.forEach((codePoint) => stringBuilder.appendCodePoint(codePoint));
				const result = stringBuilder.getOutputString();
				expect(result).toEqual(str);
			});
		});
	});
}
