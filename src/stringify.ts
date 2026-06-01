import { CircularStructureError, IllegalKeyError } from "./errors.js";
import type { ParsedKey, Query } from "./types.js";

/**
 * Options for {@link stringify}.
 */
export type StringifyOptions = {
    /**
     * Strategy to use for errors.
     * 
     * * `'throw'` - Throw an exception on any errors.
     * * `'drop'` - Drop any query parameters containing errors.
     * 
     * Errors are illegal characters in keys (`[` and `]`), empty keys (`""`), and
     * circular data structures.
     * 
     * @default 'throw'
     */
    error?: 'throw'|'drop';

    /**
     * Encode space (` `) as `+`.
     * 
     * @default false
     */
    plus?: boolean;
};

/**
 * Convert object into an extended query string.
 * 
 * `undefined` values are ignored, {@link Array} and {@link Set} objects are
 * treated as arrays, any other objects are treated as mappings while correctly
 * handling {@link Map} objects.
 * 
 * **NOTE:** This uses `instanceof` to check for {@link Set} and {@link Map},
 * meaning that check will fail if the objects come from a different realm.
 * 
 * @throws {@link CircularStructureError} Thrown if a circular structure is found in `query`.
 * @throws {@link IllegalKeyError} Thrown if there are illegal character in keys (`[` and `]`),
 * empty non-top level keys (`""`).
 */
export function stringify(query: Readonly<Query>|ReadonlyMap<string, unknown>, options?: StringifyOptions): string {
    const dropErrors = options?.error === 'drop';
    const plus = options?.plus ?? false;
    const visited = new WeakMap<object, ParsedKey>();
    const buf: ParsedKey = [];

    function stringify(path: ParsedKey, value: unknown): void {
        if (value && typeof value === 'object') {
            const otherKey = visited.get(value);
            if (otherKey !== undefined) {
                if (dropErrors) return;
                throw new CircularStructureError(path, otherKey);
            }

            visited.set(value, path.slice());

            const lastIndex = path.length;
            path.push(null);
            if (Array.isArray(value)) {
                for (let index = 0; index < value.length; ++ index) {
                    path[lastIndex] = index;
                    stringify(path, value[index]);
                }
            } else if (value instanceof Set) {
                let index = 0;
                for (const item of value) {
                    path[lastIndex] = index;
                    stringify(path, item);
                    ++ index;
                }
            } else if (value instanceof Map) {
                for (const key of value.keys()) {
                    const strKey = String(key);
                    // 2 strKey.includes() calls are much faster than one /[\[\]]/.test()
                    if (strKey.includes('[') || strKey.includes(']') || (lastIndex && !strKey)) {
                        if (dropErrors) return;
                        throw new IllegalKeyError(strKey);
                    }
                    path[lastIndex] = strKey;
                    stringify(path, value.get(key));
                }
            } else {
                for (const key in value) {
                    if (Object.hasOwn(value, key)) {
                        if (key.includes('[') || key.includes(']') || lastIndex && (key === null || key === '')) {
                            if (dropErrors) return;
                            throw new IllegalKeyError(key);
                        }
                        path[lastIndex] = key;
                        stringify(path, (value as any)[key]);
                    }
                }
            }
            path.pop();

            visited.delete(value);
        } else if (value !== undefined) {
            if (buf.length) {
                buf.push('&');
            }

            // Inlining is a bit faster in Firefox (6 Mops/s Vs 5 Mops/s) and
            // insignificantly slower in Brave (3.2 Mops/s Vs 3.1 Mops/s).
            // See: https://jsbm.dev/LFzC3d9e6CYOQ
            //
            // With inlining like this I could add an option to not %-encode
            // the brackets in the future? Is that something one would want?
            buf.push(encodeURIComponent(path[0] ?? ''));
            for (let index = 1; index < path.length; ++index) {
                const key = path[index];
                if (key === null) {
                    buf.push('%5B%5D');
                } else {
                    buf.push('%5B', encodeURIComponent(key), '%5D');
                }
            }

            if (value === null) {
                buf.push('=');
            } else {
                buf.push('=', encodeURIComponent(String(value)));
            }
        }
    }

    stringify([], query);

    let queryString = buf.join('');

    if (plus) {
        queryString = queryString.replaceAll('%20', '+');
    }

    return queryString;
}

export default stringify;
