import { CircularStructureError, IllegalKeyError, MalformedUnicode } from "./errors.js";
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

    /**
     * Array syntax.
     * 
     * * `'brackets'` - emit empty brackets, e.g. `foo[]=a&foo[]=b`
     * * `'indices'` - emit indices, e.g. `foo[0]=a&foo[1]=b`
     * 
     * The `'brackets'` option has ambiguity for nested arrays. E.g.
     * this:
     * 
     * ```JSON
     * {
     *     "foo": [
     *         ["a"],
     *         ["b"],
     *     ]
     * }
     * ```
     * 
     * And this:
     * 
     * ```JSON
     * {
     *     "foo": [
     *         ["a", "b"],
     *     ]
     * }
     * ```
     * 
     * Would both become:
     * 
     * ```
     * foo[][]=a&foo[][]=b
     * ```
     * 
     * @default 'indices'
     */
    arrayFormat?: 'brackets'|'indices';
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
    const arrayIndices = options?.arrayFormat !== 'brackets';
    const plus = options?.plus ?? false;
    const visited = new WeakMap<object, number>();
    const buf: string[] = [];

    function stringify(path: ParsedKey, value: unknown): void {
        if (value && typeof value === 'object') {
            const otherLength = visited.get(value);
            if (otherLength !== undefined) {
                if (dropErrors) return;
                throw new CircularStructureError(path, path.slice(0, otherLength));
            }

            const lastIndex = path.length;
            visited.set(value, lastIndex);

            path.push(null);
            if (Array.isArray(value)) {
                if (arrayIndices) {
                    for (let index = 0; index < value.length; ++ index) {
                        path[lastIndex] = index;
                        stringify(path, value[index]);
                    }
                } else {
                    for (let index = 0; index < value.length; ++ index) {
                        stringify(path, value[index]);
                    }
                }
            } else if (value instanceof Set) {
                if (arrayIndices) {
                    let index = 0;
                    for (const item of value) {
                        path[lastIndex] = index;
                        stringify(path, item);
                        ++ index;
                    }
                } else {
                    for (const item of value) {
                        stringify(path, item);
                    }
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
            const length = buf.length;

            try {
                if (length) {
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
            } catch (error) {
                // encodeURIComponent() may throw URIError for lone UTF-16
                // surrogate units.
                if (dropErrors) {
                    // pop() in a loop is the fastest!
                    // See: https://jsbm.dev/vGRKA15bP9odA
                    while (buf.length > length) {
                        buf.pop();
                    }
                } else if (error instanceof URIError) {
                    throw new MalformedUnicode(path, value, { cause: error });
                } else {
                    throw error;
                }
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
