import { RedefinitionError, TypeConflict } from "./errors.js";
import { parseKey } from "./parseKey.js";
import { _debugKey } from "./stringifyKey.js";
import { getTypeName, type ParsedKey, type Query } from "./types.js";

function _parseItem(query: Query, path: ParsedKey, value: string, redefine: 'first' | 'last' | 'error'): void {
    let current: any = query;
    for (let keyIndex = 0; keyIndex < path.length - 1; ++ keyIndex) {
        const subKey = path[keyIndex];

        if (subKey === null) {
            if (!Array.isArray(current)) {
                throw new TypeConflict(path.slice(0, keyIndex), 'array', getTypeName(current));
            }
            const next = path[keyIndex + 1] ? Object.create(null) : [];
            current.push(next);
            current = next;
        } else if (!current || typeof current !== 'object' || Array.isArray(current)) {
            throw new TypeConflict(path.slice(0, keyIndex), 'mapping', getTypeName(current));
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
            throw new TypeConflict(path.slice(0, path.length - 1), 'array', getTypeName(current));
        }

        current.push(value);
    } else if (!current || typeof current !== 'object' || Array.isArray(current)) {
        throw new TypeConflict(path.slice(0, path.length - 1), 'mapping', getTypeName(current));
    } else if (Object.hasOwn(current, subKey)) {
        if (redefine === 'error') {
            throw new RedefinitionError(path);
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
     * * `'first'` - Leep the value of the first occurance.
     * * `'last'` - Overwrite value with the last occurance.
     * * `'error'` - Throw a {@link RedefinitionError} if a key is redefined.
     * 
     * @default 'last'
     */
    redefine?: 'first' | 'last' | 'error';

    /**
     * Strategy to use for errors, either syntax errors or type conflicts.
     * 
     * * `'throw'` - Throw an exception on any errors.
     * * `'drop'` - Drop any query parameters containing errors.
     * 
     * @default 'throw'
     */
    error?: 'throw'|'drop';

    /**
     * Decode `+` as a space (` `).
     * 
     * @default false
     */
    plus?: boolean;
};

/**
 * Parse an extended query string in a syntax similar to Ruby on Rails.
 * 
 * @throws {TypeConflict} Thrown if two parameters expect different kinds of objects (`mapping` Vs `array`) at the same location.
 * @throws {RedefinitionError} Thrown if two parameters want to set the same final key.
 * @throws {URIError} Thrown if there is broken %-encoding.
 * @throws {SyntaxError} Thrown if there is an invalid key syntax.
 */
export function parse(queryString: string|Iterable<readonly [string, string|readonly string[]]>, options?: ParseOptions): Query {
    const redefine = options?.redefine ?? 'last';
    const dropErrors = options?.error === 'drop';
    const plus = options?.plus ?? false;
    const query: Query = Object.create(null);

    if (typeof queryString === 'string') {
        if (queryString) {
            if (plus) {
                queryString = queryString.replaceAll('+', ' ');
            }

            for (let item of queryString.split('&')) {
                try {
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
                } catch (error) {
                    if (!dropErrors) throw error;
                }
            }
        }
    } else {
        for (const [key, values] of queryString) {
            try {
                const path = parseKey(key);
                if (typeof values === 'string') {
                    _parseItem(query, path, values, redefine);
                } else {
                    for (const value of values) {
                        _parseItem(query, path, value, redefine);
                    }
                }
            } catch (error) {
                /**
                 * The possible errors happening here are {@link TypeConflict}
                 * and {@link RedefinitionError}. Each of them would happen on
                 * every value in the inner loop, thus the try-catch is outside
                 * of the loop for shortcutting.
                 */
                if (!dropErrors) throw error;
            }
        }
    }

    return query;
}

export default parse;
