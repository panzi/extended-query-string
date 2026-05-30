import { describe, expect, test } from '@jest/globals';
import { inspect } from 'node:util';

import { stringify, StringifyOptions } from '../src/stringify.js';
import type { Query } from '../src/types.js';
import { CircularStructureError, IllegalKeyError } from '../src/errors.js';

export type TestCase = {
    input: Query|Map<string, unknown>,
    result?: string,
    options?: StringifyOptions,
    error?: unknown|string|RegExp,
};

const circular: { [key: string]: any } = {};

circular.self = circular;

const TEST_CASES: TestCase[] = [
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
            foo: {
                "bär %": 'bla BLAÖ'
            }
        },
        result: 'foo%5Bb%C3%A4r%20%25%5D=bla%20BLA%C3%96',
    },
    {
        input: new Map(Object.entries({
            foo: '123',
            bar: new Set(['a', 'b', 'c']),
            baz: new Map(Object.entries({
                bla: ['x', 'y']
            }))
        })),
        result: 'foo=123&bar%5B%5D=a&bar%5B%5D=b&bar%5B%5D=c&baz%5Bbla%5D%5B%5D=x&baz%5Bbla%5D%5B%5D=y'
    },
    {
        input: circular,
        error: CircularStructureError,
    },
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
        result: '%5B%5D=',
    },
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
];

describe('stringify', () => {
    TEST_CASES.map(({ input, result, options, error }) => {
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
