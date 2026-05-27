import { parseKey } from "./parseKey.js";
import { _debugKey } from "./stringifyKey.js";
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

export function parse(value: string, options?: ParseOptions): Query {
    const redefine = options?.redefine ?? 'last';
    const query: Query = Object.create(null);

    if (value) {
        for (const item of value.split('&')) {
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

            const path = parseKey(key);

            let current: any = query;
            for (let keyIndex = 0; keyIndex < path.length - 1; ++ keyIndex) {
                const subKey = path[keyIndex];

                if (!subKey) {
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
            if (!subKey) {
                if (!Array.isArray(current)) {
                    throw new TypeError(`Conflicting types at ${_debugKey(path.slice(0, path.length - 1))}: expected array, got ${getTypeName(current)}`);
                }

                current.push(value);
            } else if (!current || typeof current !== 'object' || Array.isArray(current)) {
                throw new TypeError(`Conflicting types at ${_debugKey(path.slice(0, path.length - 1))}: expected mapping, got ${getTypeName(current)}`);
            } else if (Object.hasOwn(current, subKey)) {
                if (redefine === 'error') {
                    throw new TypeError(`Redefined key: ${JSON.stringify(key)}`);
                }

                if (redefine === 'last') {
                    current[subKey] = value;
                }
            } else {
                current[subKey] = value;
            }
        }
    }

    return query;
}

export default parse;
