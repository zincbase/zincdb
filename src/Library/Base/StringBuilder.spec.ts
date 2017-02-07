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

			it("Builds a string containing unicode characters with code up to 1114111", () => {
				let str = "";

				for (let i = 0; i < 100; i++)
					str += Encoding.CodePoint.decodeToString(166734);

				const stringBuilder = new StringBuilder();

				for (let i = 0; i < str.length / 2; i++)
					stringBuilder.appendCodePoint(166734);

				const result = stringBuilder.getOutputString();

				expect(result).toEqual(str);
			});
		});
	});
}
