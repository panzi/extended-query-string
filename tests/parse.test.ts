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
    // empty-ish things
    {
        input: '',
        result: {},
    },
    {
        input: '[]',
        result: { '': [''] },
    },
    {
        input: '=',
        result: { '': '' },
    },
    {
        input: '=&=',
        result: { '': '' },
    },
    {
        input: '&',
        result: { '': '' },
    },
    {
        input: '&&&',
        result: { '': '' },
    },
    {
        input: '=&',
        result: { '': '' },
    },
    {
        input: '&=',
        result: { '': '' },
    },
    {
        input: [['', '']],
        result: { '': '' },
    },

    // redefinitions
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
        input: [
            ['foo', ['A', 'B', 'C']]
        ],
        options: {
            redefine: 'first'
        },
        result: { foo: 'A' }
    },
    {
        input: [
            ['foo', ['A', 'B', 'C']]
        ],
        options: {
            redefine: 'last'
        },
        result: { foo: 'C' }
    },
    {
        input: [
            ['foo', ['A', 'B', 'C']]
        ],
        options: {
            redefine: 'error'
        },
        error: RedefinitionError,
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

    // plus
    {
        input: '+',
        options: { plus: true },
        result: { ' ': '' },
    },
    {
        input: '+=+',
        options: { plus: true },
        result: { ' ': ' ' },
    },
    {
        input: '+&+',
        options: { plus: true },
        result: { ' ': '' },
    },
    {
        input: 'foo+%20bar=+bla%20baz+',
        options: { plus: true },
        result: { 'foo  bar': ' bla baz ' },
    },
    {
        input: '+',
        options: { plus: false },
        result: { '+': '' },
    },
    {
        input: '+=+',
        options: { plus: false },
        result: { '+': '+' },
    },
    {
        input: '+&+',
        options: { plus: false },
        result: { '+': '' },
    },
    {
        input: 'foo+%20bar=+bla%20baz+',
        options: { plus: false },
        result: { 'foo+ bar': '+bla baz+' },
    },

    // weird characters
    {
        input: 'öÄÜß $"\'-_/\\()+%25=+%25[]',
        result: {
            'öÄÜß $"\'-_/\\()+%': '+%[]',
        },
    },

    // deep nesting
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

    // mixed encoding
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

    // errors
    // type conflicts
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
    },

    // syntax errors
    {
        input: 'foo[=',
        error: SyntaxError,
    },
    {
        input: 'foo]=',
        error: SyntaxError,
    },
    {
        input: 'foo[[]=',
        error: SyntaxError,
    },
    {
        input: 'foo[]]=',
        error: SyntaxError,
    },
    {
        input: 'foo[]bar=',
        error: SyntaxError,
    },
    {
        input: 'foo[]bar[baz]=',
        error: SyntaxError,
    },
    {
        input: 'foo[bar] [baz]=',
        error: SyntaxError,
    },

    // broken %-encoding
    {
        input: 'foo%=',
        error: URIError,
    },
    {
        input: 'foo=%',
        error: URIError,
    },
    {
        input: 'foo%FF=',
        error: URIError,
    },
    {
        input: 'foo=%FF',
        error: URIError,
    },

    // error: 'drop'
    {
        input: [
            ['foo', 'A'],
            ['foo[', 'B'],
        ],
        options: {
            error: 'drop'
        },
        result: { foo: 'A' },
    },
    {
        input: [
            ['foo', 'A'],
            ['foo]', 'B'],
        ],
        options: {
            error: 'drop'
        },
        result: { foo: 'A' },
    },
    {
        input: [
            ['foo[]', 'A'],
            ['foo[[]', 'B'],
        ],
        options: {
            error: 'drop'
        },
        result: { foo: ['A'] },
    },
    {
        input: [
            ['foo[]', 'A'],
            ['foo[]]=', 'B'],
        ],
        options: {
            error: 'drop'
        },
        result: { foo: ['A'] },
    },
    {
        input: [
            ['foo[]', 'A'],
            ['foo[]bar', 'B'],
        ],
        options: {
            error: 'drop'
        },
        result: { foo: ['A'] },
    },
    {
        input: [
            ['foo[][baz]', 'A'],
            ['foo[]bar[baz]', 'B'],
        ],
        options: {
            error: 'drop'
        },
        result: { foo: [ { baz: 'A' } ] },
    },
    {
        input: [
            ['foo[bar][baz]', 'A'],
            ['foo[bar] [baz]', 'B'],
        ],
        options: {
            error: 'drop'
        },
        result: { foo: { bar: { baz: 'A' } } },
    },
    {
        input: 'foo=A&foo%=B',
        options: {
            error: 'drop'
        },
        result: { foo: 'A' },
    },
    {
        input: 'foo=A&foo=%',
        options: {
            error: 'drop'
        },
        result: { foo: 'A' },
    },
    {
        input: 'foo=A&foo%FF=B',
        options: {
            error: 'drop'
        },
        result: { foo: 'A' },
    },
    {
        input: 'foo=A&foo=%FF',
        options: {
            error: 'drop'
        },
        result: { foo: 'A' },
    },

    // TODO: more tests, e.g. conflicts, drop error
];

describe('parse', () => {
    TEST_CASES.map(({ input, options, result, error }) => {
        const name = typeof input === 'string' ? input : inspect(input, { depth: null, compact: true, breakLength: Infinity });
        test(name, () => {
            if (error) {
                expect(() => console.error(parse(input, options))).toThrow(error);
            } else {
                const actual = parse(input, options);
                expect(actual).toEqual(result);
            }
        });
    });
});
