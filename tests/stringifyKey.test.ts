import { describe, expect, test } from '@jest/globals';
import { inspect } from 'node:util';
import type { ParsedKey } from '../src/types.js';
import stringifyKey from '../src/stringifyKey.js';

export type TestCase = {
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

    // technically incorrect inputs
    {
        input: [],
        result: '',
    },
    {
        input: [null],
        result: '',
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
