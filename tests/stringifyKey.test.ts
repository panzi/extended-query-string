import { describe, expect, test } from '@jest/globals';
import { inspect } from 'node:util';
import type { ParsedKey } from '../src/types.js';
import stringifyKey from '../src/stringifyKey.js';

type TestCase = {
    input: ParsedKey,
    result?: string,
    error?: unknown|string|RegExp,
};

const TEST_CASES: TestCase[] = [
    {
        input: [''],
        result: '',
    },
    {
        input: ['', null],
        result: '[]',
    },
    {
        input: ['foo'],
        result: 'foo',
    },
    {
        input: ['foo', 'bar', 'baz'],
        result: 'foo[bar][baz]',
    },
    {
        input: ['foo', null, null],
        result: 'foo[][]',
    },
    {
        input: ['foo', null, 'bar'],
        result: 'foo[][bar]',
    },
    {
        input: ['foo', 'bar', null],
        result: 'foo[bar][]',
    },

    {
        input: ['', 1],
        result: '[1]',
    },
    {
        input: ['foo', 0, 1],
        result: 'foo[0][1]',
    },
    {
        input: ['foo', 2, 'bar'],
        result: 'foo[2][bar]',
    },
    {
        input: ['foo', 'bar', 3],
        result: 'foo[bar][3]',
    },

    // technically incorrect inputs
    {
        input: [],
        result: '',
    },
    {
        input: [null],
        result: '',
    },
    {
        input: [1],
        result: '1',
    },
];

describe('stringifyKey', () => {
    TEST_CASES.map(({ input, result, error }) => {
        const name = typeof input === 'string' ? input : inspect(input, { depth: null, compact: true, breakLength: Infinity });
        test(name, () => {
            if (error) {
                expect(() => console.error(stringifyKey(input))).toThrow(error);
            } else {
                const actual = stringifyKey(input);
                expect(actual).toEqual(result);
            }
        });
    });
});
