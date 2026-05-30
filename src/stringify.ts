import { CircularStructureError } from "./errors.js";
import { stringifyKey, _debugKey } from "./stringifyKey.js";
import type { ParsedKey, Query } from "./types.js";

/**
 * Convert object into an extended query string.
 * 
 * `undefined` values are ignored, {@link Array} and {@link Set} objects are
 * treated as arrays, any other objects are treated as mappings while correctly
 * handling {@link Map} objects.
 * 
 * @throws {CircularStructureError}
 */
export function stringify(query: Readonly<Query>|ReadonlyMap<string, unknown>): string {
    const visited = new WeakMap<object, ParsedKey>();
    const buf: ParsedKey = [];

    function stringify(path: ParsedKey, value: unknown): void {
        if (value && typeof value === 'object') {
            const otherKey = visited.get(value);
            if (otherKey !== undefined) {
                throw new CircularStructureError(path, otherKey);
            }

            visited.set(value, path.slice());

            if (Array.isArray(value) || value instanceof Set) {
                path.push(null);
                for (const item of value) {
                    stringify(path, item);
                }
                path.pop();
            } else if (value instanceof Map) {
                for (const key of value.keys()) {
                    path.push(String(key));
                    stringify(path, value.get(key));
                    path.pop();
                }
            } else {
                for (const key in value) {
                    if (Object.hasOwn(value, key)) {
                        path.push(key);
                        stringify(path, (value as any)[key]);
                        path.pop();
                    }
                }
            }

            visited.delete(value);
        } else if (value !== undefined) {
            if (buf.length) {
                buf.push('&');
            }

            buf.push(encodeURIComponent(stringifyKey(path)), '=', encodeURIComponent(String(value)));
        }
    }

    stringify([], query);

    return buf.join('');
}

export default stringify;
