export function charIndex(str: string) {
	return Array.from(str).reduce((acc, cur, i) => {
		if (acc.has(cur)) {
			acc.set(cur, acc.get(cur)!.concat(i));
		} else {
			acc.set(cur, [i]);
		}
		return acc;
	}, new Map<string, number[]>());
}

export function isDecimal(str: string) {
	return /^[0-9]+$/.test(String(str));
}