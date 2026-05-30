import type { ParsedKey } from "./types.js";

/**
 * Turn a {@link ParsedKey} into a query parameter string.
 * 
 * The resulting string still has to be %-encoded!
 */
export function stringifyKey(path: Readonly<ParsedKey>): string {
    const buf = [path[0] ?? ''];
    for (let index = 1; index < path.length; ++index) {
        const key = path[index];
        if (!key) {
            buf.push('[]');
        } else {
            buf.push('[', encodeURIComponent(key), ']');
        }
    }

    return buf.join('');
}

/** @private */
export function _debugKey(path: Readonly<ParsedKey>): string {
    return path.length ? 'key ' + JSON.stringify(stringifyKey(path)) : 'top level';
}

export default stringifyKey;
