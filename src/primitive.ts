import { PatternCombinator, PatternFactory } from './pattern';
import { charIndex, isDecimal } from './utils';

export const SplitAt = (at: number, name: string = '') =>
	PatternFactory<[string, string]>()
		.serialize(name)
		.map((str) => [str.slice(0, at), str.slice(at)])
		.create();

export const StringSet = (strings: string[], name: string = '') =>
	PatternFactory<boolean>()
		.serialize(name)
		.map((str) => strings.includes(str) || null)
		.create();

export const IsDecimal = (name: string = '') =>
	PatternFactory<string>().serialize(name).predicate(isDecimal).create();

export const NumberOfDigit = (num: number, name: string = '') =>
	IsDecimal().chain(() =>
		PatternFactory<string>()
			.serialize(name)
			.predicate((v) => v.length === num)
			.create()
	);

export const CharacterGroup = (group = null, name: string = '') =>
	PatternFactory<string>()
		.serialize(name)
		.map((str) => {
			const res = Array.from(charIndex(str))
				.reduce((str, [_, indexes], i) => {
					indexes.forEach((j) => (str[j] = String.fromCharCode(i + 65)));
					return str;
				}, [] as string[])
				.join('');

			if (group && group !== res) {
				return null;
			}

			return res;
		})
		.create();

export const NumberRange = (min: number = 0, max: number = Infinity, name: string = '') =>
	IsDecimal().chain(() =>
		PatternFactory<number>()
			.map(Number)
			.predicate((v) => min <= v && v <= max)
			.serialize(name)
			.create()
	);

export const ValueAt = (value: string, index: number, name: string = '') =>
	PatternFactory<string>()
		.predicate((v) => v.at(index) === value)
		.serialize(name)
		.create();

export const Prefix = (prefix: string, name: string = '') =>
	PatternCombinator(name).all(...Array.from(prefix).map((c, i) => ValueAt(c, i)));

export const Suffix = (suffix: string, name: string = '') =>
	PatternCombinator(name).all(...Array.from(suffix).map((c, i) => ValueAt(c, -i - 1)));

export const MapString = (map: Record<string, string>, name: string = '') =>
	PatternFactory<string>()
		.map((str) =>
			Array.from(str).every((c) => map[c])
				? Array.from(str)
						.map((c) => map[c])
						.join('')
				: null
		)
		.serialize(name)
		.create();

export const NumberUpperBound = (startDigit: number = 1, name: string = '') =>
	PatternFactory<string>()
		.serialize(name)
		.map((str) => {
			if (!isDecimal(str) || str.length > 5) {
				return null;
			}

			let bounds = [];

			const uppers = ['9', '99', '999', '10K', '100K'];

			for (let i = startDigit - 1; i < 5; i++) {
				bounds.push(uppers[i]);
			}

			return bounds[(str.length - startDigit) % bounds.length];
		})
		.create();

export const ArithmeticSequence = (min: number, max: number, tolerance: number, name: string = '') =>
	IsDecimal().chain(() =>
		PatternFactory()
			.serialize(name)
			.predicate((str) => {
				const num = Number(str);

				return num >= min && num <= max && (num - min) % tolerance === 0;
			})
			.create()
	);

