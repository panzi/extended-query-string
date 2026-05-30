import { describe, expect, test } from '@jest/globals';
import { inspect } from 'node:util';

import { stringify } from '../src/stringify.js';
import type { Query } from '../src/types.js';
import { CircularStructureError } from '../src/errors.js';

export type TestCase = {
    input: Query|Map<string, unknown>,
    result?: string,
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
        input: {
            foo: {
                bar: 'bla BLA'
            }
        },
        result: 'foo%5Bbar%5D=bla%20BLA'
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
    // TODO: more tests including error cases
];

describe('stringify', () => {
    TEST_CASES.map(({ input, result, error }) => {
        const name = inspect(input, { depth: null });
        test(name, () => {
            if (error) {
                expect(() => stringify(input)).toThrow(error);
            } else {
                const actual = stringify(input);
                expect(actual).toEqual(result);
            }
        });
    });
});
