import { describe, expect, test } from '@jest/globals';
import { inspect } from 'node:util';

import { ParseOptions, parse } from '../src/parse.js';
import type { Query } from '../src/types.js';

export type TestCase = {
    input: string|Iterable<[string, string|string[]]>,
    options?: ParseOptions,
    result?: Query,
    error?: Error|string|RegExp,
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
        error: 'Redefined key: "foo"',
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

    // TODO: more tests, e.g. conflicts
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
