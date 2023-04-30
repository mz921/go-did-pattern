import { Flags } from './data';
import { PatternCombinator, PatternFactory } from './pattern';
import {
	NumberOfDigit,
	CharacterGroup,
	SplitAt,
	NumberRange,
	ValueAt,
	Prefix,
	MapString,
	NumberUpperBound as _NumberUpperBound,
	StringSet,
	Suffix,
	ArithmeticSequence,
} from './primitive';
import { Arabic, CN, JP } from './translate';
import { isDecimal } from './utils';

// Matches character group like ABC,AAB,etc.
export const DigitCharacterGroup = PatternCombinator()
	.all(
		PatternCombinator().any(
			NumberOfDigit(3),
			NumberOfDigit(4),
			NumberOfDigit(5),
			NumberOfDigit(6),
			NumberOfDigit(7),
			NumberOfDigit(8)
		),
		CharacterGroup()
	)
	.select(([_, group]) => group);

// Matches the upper bound of number like 999 and 10k,etc.
export const NumberUpperBound = _NumberUpperBound(1);

// 360Degree
export const Degree360 = SplitAt(3).ap([NumberRange(0, 360, '360'), StringSet(['°'], 'Degree')]);

// Matches decimal string starts with 0x
export const DecimalWith0x = SplitAt(2).ap([Prefix('0x', '0x'), NumberUpperBound]);

// Matches 999CN
export const CNNumber = MapString(CN, 'CN').concat(
	() => PatternCombinator('999').all(NumberRange(0, 999), NumberOfDigit(3)),
	true
);

// Matches 999JP
export const JPNumber = MapString(JP, 'JP').concat(
	() => PatternCombinator('999').all(NumberRange(0, 999), NumberOfDigit(3)),
	true
);

// Matches arabic number like Arabic999 and Arabic10k,etc.
export const ArabicNumber = MapString(Arabic, 'Arabic').concat(() => _NumberUpperBound(3));

// Matches Flag999
export const FlagNumber = SplitAt(4).ap([
	StringSet(Flags, 'Flag'),
	PatternCombinator('999').all(NumberRange(0, 999), NumberOfDigit(3)),
]);

// Matches numbers like 0XXX and 00XX,etc.
export const X = [
	...[
		Prefix('0', '0XXX'),
		Prefix('00', '00XX'),
		PatternCombinator('0X0X').all(Prefix('0'), ValueAt('0', 2)),
		PatternCombinator('0XX0').all(Prefix('0'), Suffix('0')),
		Suffix('00', 'XX00'),
		PatternCombinator('X0X0').all(Suffix('0'), ValueAt('0', 1)),
		Suffix('88', 'XX88'),
		Suffix('69', 'XX69'),
	].map((p) => NumberOfDigit(4).chain(() => p)),
	...[
		Suffix('000', 'XX000'),
		PatternCombinator('00XX0').all(Prefix('00'), Suffix('0')),
		Prefix('000', '000XX'),
		Suffix('420', 'XX420'),
		Prefix('69', '69XXX'),
		Suffix('69', 'XXX69'),
		Prefix('00', '00XXX'),
		Suffix('00', 'XXX00'),
		SplitAt(1, 'XABCD').map(([_, val]) => CharacterGroup('ABCD').exec(val)),
	].map((p) => NumberOfDigit(5).chain(() => p)),
	...[
		PatternCombinator('00XX00').all(Prefix('00'), Suffix('00')),
		Prefix('420', '420XXX'),
		Suffix('420', 'XXX420'),
		Prefix('000', '000XXX'),
		Suffix('000', 'XXX000'),
		Suffix('69', 'XXXX69'),
	].map((p) => NumberOfDigit(6).chain(() => p)),
	NumberOfDigit(11).chain(() => SplitAt(3, 'XXXAAAAAAAA').map(([_, val]) => CharacterGroup('AAAAAAAA').exec(val))),
];

// Matches TimesTable
export const TimesTable = NumberOfDigit(4).chain((str) => {
	return PatternFactory()
		.predicate(() => {
			const input = Array.from(str.slice(0, 2)).map(Number);
			const output = Number(str.slice(2));
			return input[0] <= input[1] && input[0] * input[1] === output;
		})
		.serialize('TimesTable')
		.create();
});

// Matches MMDD
export const MMDD = NumberOfDigit(4).chain((str) => {
	return PatternFactory()
		.predicate(() => {
			const year = new Date().getFullYear();
			const month = Number(str.slice(0, 2));

			if (month < 1 || month > 12) {
				return false;
			}

			return Number(str.slice(2)) <= new Date(year, month, 0).getDate();
		})
		.serialize('MMDD')
		.create();
});

// Matches AshareCode
export const AShareCode = NumberOfDigit(6).chain(() =>
	PatternCombinator('AShareCode').any(NumberRange(0, 999), NumberRange(600000, 603999))
);

// Matches WanClub
export const WanClub = ArithmeticSequence(10000, 9990000, 10000, 'WanClub');

// Matches Hex
export const Hex = SplitAt(2).ap(
	[
		Prefix('0x', 'Hex'),
		PatternFactory()
			.map((str) => {
				for (let c of str) {
					if (!isDecimal(c) && !('a' <= c && c <= 'f')) {
						return null;
					}
				}
				return str.length;
			})
			.create(),
	],
	true
);
