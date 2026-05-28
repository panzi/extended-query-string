import { parseKey } from "./parseKey.js";
import stringifyKey, { _debugKey } from "./stringifyKey.js";
import type { Query } from "./types.js";

function getTypeName(value: unknown): string {
    if (value === null) {
        return 'null';
    }

    if (Array.isArray(value)) {
        return 'array';
    }

    const typeName = typeof value;

    if (typeName === 'object') {
        return 'mapping';
    }

    return typeName;
}

function _parseItem(query: Query, path: readonly (string|null)[], value: string, redefine: 'first' | 'last' | 'error'): void {
    let current: any = query;
    for (let keyIndex = 0; keyIndex < path.length - 1; ++ keyIndex) {
        const subKey = path[keyIndex];

        if (subKey === null) {
            if (!Array.isArray(current)) {
                throw new TypeError(`Conflicting types at ${_debugKey(path.slice(0, keyIndex))}: expected array, got ${getTypeName(current)}`);
            }
            const next = path[keyIndex + 1] ? Object.create(null) : [];
            current.push(next);
            current = next;
        } else if (!current || typeof current !== 'object' || Array.isArray(current)) {
            throw new TypeError(`Conflicting types at ${_debugKey(path.slice(0, keyIndex))}: expected mapping, got ${getTypeName(current)}`);
        } else if (Object.hasOwn(current, subKey)) {
            current = current[subKey];
        } else {
            const next = path[keyIndex + 1] ? Object.create(null) : [];
            current[subKey] = next;
            current = next;
        }
    }

    const subKey = path[path.length - 1];
    if (subKey === null) {
        if (!Array.isArray(current)) {
            throw new TypeError(`Conflicting types at ${_debugKey(path.slice(0, path.length - 1))}: expected array, got ${getTypeName(current)}`);
        }

        current.push(value);
    } else if (!current || typeof current !== 'object' || Array.isArray(current)) {
        throw new TypeError(`Conflicting types at ${_debugKey(path.slice(0, path.length - 1))}: expected mapping, got ${getTypeName(current)}`);
    } else if (Object.hasOwn(current, subKey)) {
        if (redefine === 'error') {
            throw new TypeError(`Redefined key: ${JSON.stringify(stringifyKey(path))}`);
        }

        if (redefine === 'last') {
            current[subKey] = value;
        }
    } else {
        current[subKey] = value;
    }
}

export type ParseOptions = {
    /**
     * Strategy to use when a key is defined multiple times.
     * 
     * * `'first'` keep the value of the first occurance
     * * `'last'` overwrite value with the last occurance
     * * `'error'` throw a `TypeError` if a key is redefined
     * 
     * @default 'last'
     */
    redefine?: 'first' | 'last' | 'error';
};

export function parse(queryString: string|Iterable<readonly [string, string|readonly string[]]>, options?: ParseOptions): Query {
    const redefine = options?.redefine ?? 'last';
    const query: Query = Object.create(null);

    if (typeof queryString === 'string') {
        if (queryString) {
            for (const item of queryString.split('&')) {
                let key: string;
                let value: string;

                const eqIndex = item.indexOf('=');
                if (eqIndex >= 0) {
                    key = decodeURIComponent(item.slice(0, eqIndex));
                    value = decodeURIComponent(item.slice(eqIndex + 1));
                } else {
                    key = decodeURIComponent(item);
                    value = '';
                }

                _parseItem(query, parseKey(key), value, redefine);
            }
        }
    } else {
        for (const [key, values] of queryString) {
            const path = parseKey(key);
            if (typeof values === 'string') {
                _parseItem(query, path, values, redefine);
            } else {
                for (const value of values) {
                    _parseItem(query, path, value, redefine);
                }
            }
        }
    }

    return query;
}

export default parse;
