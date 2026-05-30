import { describe, expect, test } from '@jest/globals';
import { inspect } from 'node:util';
import type { ParsedKey } from '../src/types.js';
import parseKey from '../src/parseKey.js';
import { KeySyntaxError } from '../src/errors.js';

export type TestCase = {
    input: string,
    result?: ParsedKey,
    error?: unknown|string|RegExp,
};

const TEST_CASES: TestCase[] = [
    {
        input: '',
        result: [''],
    },
    {
        input: '[]',
        result: ['', null],
    },
    {
        input: 'foo',
        result: ['foo'],
    },
    {
        input: 'foo[bar][baz]',
        result: ['foo', 'bar', 'baz'],
    },
    {
        input: 'foo[][]',
        result: ['foo', null, null],
    },
    {
        input: 'foo[][bar]',
        result: ['foo', null, 'bar'],
    },
    {
        input: 'foo[bar][]',
        result: ['foo', 'bar', null],
    },

    // syntax errors
    {
        input: 'foo[',
        error: KeySyntaxError,
    },
    {
        input: 'foo]',
        error: KeySyntaxError,
    },
    {
        input: 'foo[[]',
        error: KeySyntaxError,
    },
    {
        input: 'foo[]]',
        error: KeySyntaxError,
    },
    {
        input: 'foo[]bar',
        error: KeySyntaxError,
    },
    {
        input: 'foo[]bar[baz]',
        error: KeySyntaxError,
    },
    {
        input: 'foo[bar] [baz]',
        error: KeySyntaxError,
    },
];

describe('parse', () => {
    TEST_CASES.map(({ input, result, error }) => {
        const name = typeof input === 'string' ? input : inspect(input, { depth: null, compact: true, breakLength: Infinity });
        test(name, () => {
            if (error) {
                expect(() => console.error(parseKey(input))).toThrow(error);
            } else {
                const actual = parseKey(input);
                expect(actual).toEqual(result);
            }
        });
    });
});
