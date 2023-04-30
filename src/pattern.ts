import { memorize } from './common';

interface PatternElements<T> {
	mapper: (str: string) => T;
	serializer: (value: T) => string;
	predicate: (value: T) => boolean;
	ap: (value: T, pattern: Pattern | Pattern[], reverse?: boolean) => string | null;
}

export interface Pattern<T = any> {
	exec: (arg: string) => T;
	serialize(str: string): string;
	map<NT>(mapper: (value: T) => NT): Pattern<NT>;
	test(str: string): boolean;
	chain<NT>(pattern: (val: T, str: string) => Pattern<NT>): Pattern<NT>;
	concat(pattern: (val: T) => Pattern, reverse?: boolean): Pattern;
	ap(pattern: Pattern | Pattern[], reverse?: boolean): Pattern;
}

export const PatternFactory = <T, U = T>() => {
	let _splitter, _reducer, _initial;
	let _mapper = (v) => v;
	let _serializer = (v) => String(v);
	let _predicate = (v) => !!v;
	let _ap = (values, patterns, reverse = false) => {
		let acc = '';
		for (let i = 0; i < values.length; i++) {
			const str = patterns[i].serialize(values[i]);

			if (!str) {
				return null;
			}
			if (reverse) {
				acc = str + acc;
			} else {
				acc += str;
			}
		}
		return acc;
	};

	const factory = {
		map(mapper: PatternElements<T>['mapper']) {
			_mapper = mapper;
			return factory;
		},
		serialize(serializer: PatternElements<T>['serializer'] | string) {
			if (!serializer) {
				return factory;
			}
			_serializer = typeof serializer === 'string' ? () => serializer : serializer;
			return factory;
		},
		predicate(predicate: PatternElements<T>['predicate']) {
			_predicate = predicate;
			return factory;
		},
		ap(ap: PatternElements<T>['ap']) {
			_ap = ap;
			return factory;
		},
		create() {
			const elements = {
				splitter: _splitter,
				mapper: _mapper,
				reducer: _reducer,
				initial: _initial,
				serializer: _serializer,
				predicate: _predicate,
				ap: _ap,
			};

			return Pattern<U>(elements);
		},
	};

	return factory;
};

export const Pattern = <T = any>(elements: PatternElements<T>) => {
	const { mapper, serializer, predicate, ap } = elements;

	const testFirst = function (fn, test?) {
		return function (str: string) {
			const res = (test || this.test.bind(this))(str);
			if (res) {
				return fn.call(this, str);
			}
			return null;
		};
	};

	return {
		exec: memorize(function (str: string) {
			return mapper(str);
		}),

		serialize: testFirst(function (str: string) {
			return serializer(this.exec(str));
		}),

		map<NT>(mapper: (value: T) => NT) {
			const test = this.test.bind(this);
			const exec = this.exec.bind(this);
			return {
				...(this as Pattern),
				test: function (str: string) {
					return this.exec(str) !== null;
				},
				exec: testFirst(function (str: string) {
					return mapper(exec(str));
				}, test),
			};
		},

		test(str: string) {
			const res = this.exec(str);
			return res === null ? false : predicate(res);
		},

		chain<U>(pattern: (val: T, str?: string) => Pattern<U>) {
			const test = this.test.bind(this);
			const exec = this.exec.bind(this);
			return {
				...(this as Pattern),
				test: testFirst(function (str: string) {
					const value = exec(str);

					return pattern(value, str).test(value);
				}, test),
				serialize: testFirst(function (str: string) {
					const value = exec(str);

					return pattern(value, str).serialize(value);
				}, this.test.bind(this)),
				exec: testFirst(function (str: string) {
					const value = exec(str);

					return pattern(value, str).exec(value);
				}, this.test.bind(this)),
			};
		},
		concat<U>(pattern: (val: T) => Pattern<U>, reverse = false) {
			const serialize = this.serialize.bind(this);
			const chain = this.chain(pattern);

			return {
				...chain,
				serialize: testFirst(function (str: string) {
					return reverse
						? chain.serialize(str).concat(serialize(str))
						: serialize(str).concat(chain.serialize(str));
				}, chain.test.bind(chain)),
			};
		},
		ap: function (pattern: Pattern | Pattern[], reverse = false) {
			const test = this.test.bind(this);
			const exec = this.exec.bind(this);

			return {
				...(this as Pattern),
				exec: testFirst(function (str: string) {
					return ap(exec(str), pattern, reverse);
				}, test),
			};
		},
	} as unknown as Pattern<T>;
};

export const PatternCombinator = (name?: string) => {
	const isFail = (patterns: Pattern[], cond: 'some' | 'every') => {
		return function (fn: (str: string) => any) {
			return function (str: string) {
				const fail = patterns[cond]((p) => !p.test(str));

				if (fail) {
					return null;
				}

				return fn(str);
			};
		};
	};

	const common = (failCond: ReturnType<typeof isFail>, selector: CallableFunction, patterns: Pattern[]) => {
		let _selector = selector;

		const combinator = {
			exec: failCond((str) => _selector(patterns.map((p) => p.exec(str)))),
			serialize: failCond((str) => name || _selector(patterns.map((p) => p.serialize(str)))),
			map(mapper: (value: any) => any) {
				return EmptyPattern().map.call(this, mapper);
			},
			test(str: string) {
				return !!this.exec(str);
			},
			select(selector: (results: any[]) => any) {
				_selector = selector;
				return combinator;
			},
			chain(pattern: (val: any, str: string) => Pattern): Pattern {
				return EmptyPattern().chain.call(this, pattern);
			},
			concat(pattern: (val: any) => Pattern, reverse = false): Pattern {
				return EmptyPattern().concat.call(this, pattern, reverse);
			},
			ap(pattern: Pattern | Pattern[]) {
				return EmptyPattern().ap.call(this, pattern);
			},
		};

		return combinator;
	};

	return {
		all: (...patterns: Pattern[]) => {
			let _selector = (i) => i;

			const someFail = isFail(patterns, 'some');

			return common(someFail, _selector, patterns);
		},

		any: (...patterns: Pattern[]) => {
			let _selector = (items: any[]) => items.filter((i) => i)[0];

			const everyFail = isFail(patterns, 'every');

			return common(everyFail, _selector, patterns);
		},
	};
};

export const EmptyPattern = () => {
	return PatternFactory()
		.map((i) => i)
		.create();
};
