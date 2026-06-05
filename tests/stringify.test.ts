import { describe, expect, test } from '@jest/globals';
import { inspect } from 'node:util';

import { stringify, StringifyOptions } from '../src/stringify.js';
import type { Query } from '../src/types.js';
import { CircularStructureError, IllegalKeyError, MalformedUnicode } from '../src/errors.js';

type TestCase = {
    input: Query|Map<string, unknown>,
    result?: string,
    options?: StringifyOptions,
    error?: unknown|string|RegExp,
};

type TestGroup = {
    name: string;
    tests: TestCase[];
};

const circular: { [key: string]: any } = {};

circular.self = circular;

const TEST_CASES: TestGroup[] = [
    {
        name: 'empty-ish things',
        tests: [
            {
                input: {},
                result: '',
            },
            {
                input: new Map(),
                result: '',
            },
            {
                input: {
                    '': ''
                },
                result: '=',
            },
            {
                input: {
                    '': ['']
                },
                result: '%5B0%5D=',
            },
        ]
    },
    {
        name: 'weird characters',
        tests: [
            {
                input: {
                    foo: {
                        "bär %": 'bla BLAÖ\0'
                    }
                },
                result: 'foo%5Bb%C3%A4r%20%25%5D=bla%20BLA%C3%96%00',
            },
        ]
    },
    {
        name: 'Map and Set',
        tests: [
            {
                input: new Map(Object.entries({
                    foo: '123',
                    bar: new Set(['a', 'b', 'c']),
                    baz: new Map(Object.entries({
                        bla: ['x', 'y']
                    })),
                    empty: new Set([]),
                })),
                result: 'foo=123&bar%5B0%5D=a&bar%5B1%5D=b&bar%5B2%5D=c&baz%5Bbla%5D%5B0%5D=x&baz%5Bbla%5D%5B1%5D=y'
            },
        ]
    },
    {
        name: 'plus (+) syntax',
        tests: [
            {
                input: {
                    ' ': ' '
                },
                options: { plus: true },
                result: '+=+',
            },
            {
                input: {
                    'foo bar': 'baz bla'
                },
                options: { plus: true },
                result: 'foo+bar=baz+bla',
            },
        ]
    },
    {
        name: 'nested arrays',
        tests: [
            {
                input: { foo: ['a', 'b', ['c']] },
                result: 'foo%5B0%5D=a&foo%5B1%5D=b&foo%5B2%5D%5B0%5D=c'
            },
        ]
    },
    // errors
    {
        name: 'circular structure',
        tests: [
            {
                input: circular,
                error: CircularStructureError,
            },
            {
                input: { circular },
                error: CircularStructureError,
            },
            {
                input: { foo: [circular] },
                error: CircularStructureError,
            },
            {
                input: circular,
                options: { error: 'drop' },
                result: '',
            },
            {
                input: { foo: { bar: 'baz', circular } },
                options: { error: 'drop' },
                result: 'foo%5Bbar%5D=baz',
            },
        ]
    },
    {
        name: 'illegal keys',
        tests: [
            {
                input: {
                    foo: { '': '' },
                },
                error: IllegalKeyError,
            },
            {
                input: {
                    '[': '',
                },
                error: IllegalKeyError,
            },
            {
                input: {
                    ']': '',
                },
                error: IllegalKeyError,
            },
            {
                input: {
                    '[]': '',
                },
                error: IllegalKeyError,
            },
            {
                input: {
                    'foo[]': '',
                },
                error: IllegalKeyError,
            },
        ]
    },
    {
        name: 'malformed unicode',
        tests: [
            {
                input: {
                    '\uDC00': 'x'
                },
                error: MalformedUnicode
            },
            {
                input: {
                    'x': '\uD800'
                },
                error: MalformedUnicode
            },
            {
                input: {
                    a: 'A',
                    'b\uD800': 'B',
                    c: 'C',
                    d: '\uDC00D',
                    e: 'E',
                },
                options: {
                    error: 'drop'
                },
                result: 'a=A&c=C&e=E'
            }
        ]
    },
];

describe('stringify', () => {
    TEST_CASES.map(({ name, tests }) => {
        describe(name, () => {
            tests.map(({ input, result, options, error }) => {
                const name = inspect(input, { depth: null, compact: true, breakLength: Infinity });
                test(name, () => {
                    if (error) {
                        expect(() => console.error(JSON.stringify(stringify(input, options)))).toThrow(error);
                    } else {
                        const actual = stringify(input, options);
                        expect(actual).toEqual(result);
                    }
                });
            });
        });
    });
});
