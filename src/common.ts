export function memorize<T>(fn: (str: string) => T) {
	const cache = new Map<string, any>();

	return function (arg: string): T {
        if(cache.has(arg)) {
            return cache.get(arg);
        }

        const res = fn(arg);

        cache.set(arg, res);

        return res;
    };
}
