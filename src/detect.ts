import { GoDID } from './data';
import * as patterns from './godid';
import { Pattern } from './pattern';
import { StringSet } from './primitive';

const GoDIDPatterns = Object.values(patterns);

const GoDIDList = StringSet(GoDID);

export function detectPatterns(str: string) {
	const set = new Set();

	if (str.slice(str.length - 4, str.length) !== '.bit') {
		throw new Error(`Invalid input: ${str}`);
	}

	// Remove '.bit' suffix
	str = str.slice(0, str.length - 4);

	const detect = (p: Pattern) => {
		if (
			p
				.map(() => p.serialize(str))
				.chain(() => GoDIDList)
				.test(str)
		) {
			set.add(p.serialize(str));
		}
	};

	GoDIDPatterns.forEach((p) => (Array.isArray(p) ? p.forEach(detect) : detect(p)));

	return set;
}
