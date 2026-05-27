import { stringifyKey, _debugKey } from "./stringifyKey.js";
import type { Query } from "./types.js";

export function stringify(query: Readonly<Query>): string {
    const visited = new WeakMap<object, string[]>();
    const buf: string[] = [];

    function stringify(path: string[], value: unknown): void {
        if (value && typeof value === 'object') {
            const otherKey = visited.get(value);
            if (otherKey !== undefined) {
                throw new TypeError(`Cannot stringify circular structure! Found same object at ${_debugKey(otherKey)} and at ${_debugKey(path)}`);
            }

            visited.set(value, path.slice());

            if (Array.isArray(value) || value instanceof Set) {
                path.push('');
                for (const item of value) {
                    stringify(path, item);
                }
                path.pop();
            } else if (value instanceof Map) {
                for (const key in value) {
                    path.push(key);
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
