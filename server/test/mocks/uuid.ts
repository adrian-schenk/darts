const randomHex = (length: number): string => {
	const hex = '0123456789abcdef';
	let output = '';

	for (let index = 0; index < length; index += 1) {
		output += hex[Math.floor(Math.random() * hex.length)];
	}

	return output;
};

export const v4 = (): string => `00000000-0000-4000-8000-00${randomHex(10)}`;
