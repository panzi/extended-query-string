import { describe, expect, test } from '@jest/globals';
import { inspect } from 'node:util';

import { ParseOptions, parse } from '../src/parse.js';
import type { Query } from '../src/types.js';
import {
    IllegalIndexError, KeySyntaxError,
    PercentEncodingError, RedefinitionError,
    TypeConflict,
} from '../src/errors.js';

type TestCase = {
    input: string|Iterable<[string, string|string[]]>,
    options?: ParseOptions,
    result?: Query,
    error?: unknown|string|RegExp,
};

type TestGroup = {
    name: string;
    tests: TestCase[];
};

const TEST_CASES: TestGroup[] = [
    {
        name: 'empty-ish things',
        tests: [
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
        ]
    },
    {
        name: 'redefinitions',
        tests: [
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
        ]
    },
    {
        name: 'key looking like an index',
        tests: [
            {
                input: [
                    ['foo[-1]', 'A'],
                    ['foo[0.0]', 'B'],
                    ['foo[+0]', 'C'],
                    ['foo[ 0 ]', 'D'],
                ],
                result: {
                    foo: {
                        '-1': 'A',
                        '0.0': 'B',
                        '+0': 'C',
                        ' 0 ': 'D',
                    }
                }
            },
        ]
    },
    {
        name: 'plus (+) syntax',
        tests: [
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
        ]
    },
    {
        name: 'weird characters',
        tests: [
            {
                input: 'öÄÜß $"\'-_/\\()+%25=+%25[]',
                result: {
                    'öÄÜß $"\'-_/\\()+%': '+%[]',
                },
            },
        ]
    },
    {
        name: 'deep nesting',
        tests: [
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
        ]
    },
    {
        name: 'mixed encoding',
        tests: [
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
        ]
    },
    // errors
    {
        name: 'type conflicts',
        tests: [
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
        ]
    },
    {
        name: 'syntax errors',
        tests: [
            {
                input: 'foo[=',
                error: KeySyntaxError,
            },
            {
                input: 'foo]=',
                error: KeySyntaxError,
            },
            {
                input: 'foo[[]=',
                error: KeySyntaxError,
            },
            {
                input: 'foo[]]=',
                error: KeySyntaxError,
            },
            {
                input: 'foo[]bar=',
                error: KeySyntaxError,
            },
            {
                input: 'foo[]bar[baz]=',
                error: KeySyntaxError,
            },
            {
                input: 'foo[bar] [baz]=',
                error: KeySyntaxError,
            },
        ]
    },
    {
        name: 'broken %-encoding',
        tests: [
            {
                input: 'foo%=',
                error: PercentEncodingError,
            },
            {
                input: 'foo=%',
                error: PercentEncodingError,
            },
            {
                input: 'foo%FF=',
                error: PercentEncodingError,
            },
            {
                input: 'foo=%FF',
                error: PercentEncodingError,
            },
        ]
    },
    {
        name: "error: 'drop'",
        tests: [
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
        ]
    },
    {
        name: 'mappings inside of arrays',
        tests: [
            {
                input: [
                    ['users[][first_name]', 'John'],
                    ['users[][last_name]', 'Smith'],
                    ['users[][first_name]', 'Max'],
                    ['users[][last_name]', 'Mustermann'],
                ],
                result: {
                    users: [
                        {
                            first_name: 'John',
                            last_name: 'Smith',
                        },
                        {
                            first_name: 'Max',
                            last_name: 'Mustermann',
                        },
                    ]
                },
                options: { redefine: 'error' },
            },
            {
                input: [
                    ['users[][name]', 'Alice'],
                    ['users[][contact][][type]', 'email'],
                    ['users[][contact][][value]', 'alice@example.com'],
                    ['users[][contact][][type]', 'tel'],
                    ['users[][contact][][value]', '555 555-5555'],
                    ['users[][name]', 'Bob'],
                    ['users[][contact][][type]', 'email'],
                    ['users[][contact][][value]', 'bob@example.com'],
                ],
                result: {
                    users: [
                        {
                            name: 'Alice',
                            contact: [
                                {
                                    type: 'email',
                                    value: 'alice@example.com',
                                },
                                {
                                    type: 'tel',
                                    value: '555 555-5555',
                                },
                            ]
                        },
                        {
                            name: 'Bob',
                            contact: [
                                {
                                    type: 'email',
                                    value: 'bob@example.com',
                                },
                            ]
                        },
                    ]
                },
                options: { redefine: 'error' },
            },
            {
                input: [
                    ['foo[][bar][]', 'A'],
                    ['foo[][bar][]', 'B'],
                    ['foo[][bar][]', 'C'],
                ],
                result: {
                    foo: [
                        {
                            bar: ['A', 'B', 'C']
                        }
                    ]
                },
                options: { redefine: 'error' },
            },
            {
                input: [
                    ['users[0][first_name]', 'John'],
                    ['users[1][first_name]', 'Max'],
                    ['users[0][last_name]', 'Smith'],
                    ['users[1][last_name]', 'Mustermann'],
                ],
                result: {
                    users: [
                        {
                            first_name: 'John',
                            last_name: 'Smith',
                        },
                        {
                            first_name: 'Max',
                            last_name: 'Mustermann',
                        },
                    ]
                },
                options: { redefine: 'error' },
            },
            {
                input: [
                    ['users[0][name]', 'Alice'],
                    ['users[0][contact][0][type]', 'email'],
                    ['users[0][contact][1][type]', 'tel'],
                    ['users[0][contact][0][value]', 'alice@example.com'],
                    ['users[0][contact][1][value]', '555 555-5555'],
                    ['users[1][name]', 'Bob'],
                    ['users[1][contact][0][type]', 'email'],
                    ['users[1][contact][0][value]', 'bob@example.com'],
                ],
                result: {
                    users: [
                        {
                            name: 'Alice',
                            contact: [
                                {
                                    type: 'email',
                                    value: 'alice@example.com',
                                },
                                {
                                    type: 'tel',
                                    value: '555 555-5555',
                                },
                            ]
                        },
                        {
                            name: 'Bob',
                            contact: [
                                {
                                    type: 'email',
                                    value: 'bob@example.com',
                                },
                            ]
                        },
                    ]
                },
                options: { redefine: 'error' },
            },
            {
                input: [
                    ['foo[0][bar][0]', 'A'],
                    ['foo[0][bar][1]', 'B'],
                    ['foo[0][bar][2]', 'C'],
                ],
                result: {
                    foo: [
                        {
                            bar: ['A', 'B', 'C']
                        }
                    ]
                },
                options: { redefine: 'error' },
            },
            {
                input: [
                    ['foo[0][bar][0]', 'A'],
                    ['foo[1][bar][0]', 'B'],
                    ['foo[2][bar][0]', 'C'],
                ],
                result: {
                    foo: [
                        { bar: ['A'] },
                        { bar: ['B'] },
                        { bar: ['C'] },
                    ]
                },
                options: { redefine: 'error' },
            },
        ]
    },
    {
        name: 'illegal indices',
        tests: [
            {
                input: [
                    ['foo[0]', 'A'],
                    ['foo[2]', 'B'],
                    ['foo[1]', 'C'],
                ],
                error: IllegalIndexError
            },
            {
                input: [
                    ['foo[1]', 'A'],
                ],
                error: IllegalIndexError
            },
            {
                input: [
                    ['foo[0]', 'A'],
                    ['foo[2]', 'B'],
                    ['foo[1]', 'C'],
                ],
                result: {
                    foo: ['A', 'C']
                },
                options: {
                    error: 'drop'
                }
            },
        ]
    },
];

describe('parse', () => {
    TEST_CASES.map(({ name, tests }) => {
        describe(name, () => {
            tests.map(({ input, options, result, error }) => {
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
    });
});
