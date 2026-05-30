import { describe, expect, test } from '@jest/globals';
import { inspect } from 'node:util';

import { ParseOptions, parse } from '../src/parse.js';
import type { Query } from '../src/types.js';
import { RedefinitionError, TypeConflict } from '../src/errors.js';

export type TestCase = {
    input: string|Iterable<[string, string|string[]]>,
    options?: ParseOptions,
    result?: Query,
    error?: unknown|string|RegExp,
};

const TEST_CASES: TestCase[] = [
    {
        input: '',
        result: {},
    },
    {
        input: '=',
        result: {'':''},
    },
    {
        input: '=&=',
        result: {'':''},
    },
    {
        input: '&',
        result: {'':''},
    },
    {
        input: '=&',
        result: {'':''},
    },
    {
        input: '&=',
        result: {'':''},
    },
    {
        input: 'foo=FOO&bar=BAR',
        result: {
            foo: 'FOO',
            bar: 'BAR',
        },
    },
    {
        input: 'foo=A&foo=B',
        result: {
            foo: 'B',
        },
    },
    {
        input: 'foo=A&foo=B',
        result: {
            foo: 'B',
        },
        options: {
            redefine: 'last'
        },
    },
    {
        input: 'foo=A&foo=B',
        result: {
            foo: 'A',
        },
        options: {
            redefine: 'first'
        },
    },
    {
        input: 'foo=A&foo=B',
        error: RedefinitionError,
        options: {
            redefine: 'error'
        },
    },
    {
        input: [
            ['foo[bar][baz][bla]', 'A'],
            ['foo[else]', 'X'],
            ['foo[bar][baz][bla]', 'B'],
        ],
        error: RedefinitionError,
        options: {
            redefine: 'error'
        },
    },
    {
        input: 'öÄÜß $"\'-_/\\()=[]',
        result: {
            'öÄÜß $"\'-_/\\()': '[]',
        },
    },
    {
        input: 'a[b][c][d][e][f]=one&a[b][c][g][h]=two&a[b][i]=three',
        result: {
            a: {
                b: {
                    c: {
                        d: {
                            e: {
                                f: 'one'
                            }
                        },
                        g: {
                            h: 'two'
                        }
                    },
                    i: 'three'
                }
            }
        }
    },
    {
        input: 'foo[]=a&foo[]=b&foo[][][]=c',
        result: {
            foo: ['a', 'b', [['c']]]
        }
    },
    {
        input: 'foo%20bar%5Bbaz%5D=%20',
        result: {
            'foo bar': {
                baz: ' '
            }
        }
    },
    {
        input: 'foo%20bar[baz%5D=%20',
        result: {
            'foo bar': {
                baz: ' '
            }
        }
    },
    {
        input: 'foo%20bar%5Bbaz]=%20',
        result: {
            'foo bar': {
                baz: ' '
            }
        }
    },
    {
        input: [
            ['foo[bar]', 'object'],
            ['foo[]', 'array'],
        ],
        error: TypeConflict
    },
    {
        input: [
            ['foo[bar][][baz]', 'object'],
            ['foo[bar][baz][]', 'array'],
        ],
        error: TypeConflict
    },
    {
        input: [
            ['foo[]', 'A'],
            ['foo[bar]', 'B'],
            ['bar[baz]', 'X'],
            ['bar[baz]', 'Y'],
        ],
        result: {
            foo: ['A'],
            bar: {
                baz: 'X'
            }
        },
        options: {
            redefine: 'error',
            error: 'drop',
        }
    }

    // TODO: more tests, e.g. conflicts, drop error
];

describe('parse', () => {
    TEST_CASES.map(({ input, options, result, error }) => {
        const name = typeof input === 'string' ? input : inspect(input, { depth: null });
        test(name, () => {
            if (error) {
                expect(() => parse(input, options)).toThrow(error);
            } else {
                const actual = parse(input, options);
                expect(actual).toEqual(result);
            }
        });
    });
});
