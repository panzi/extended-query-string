import type { ParsedKey } from "./types";

export function stringifyKey(path: Readonly<ParsedKey>): string {
    const buf = [path[0] ?? ''];
    for (let index = 1; index < path.length; ++index) {
        buf.push('[', path[index] ?? '', ']');
    }

    return buf.join('');
}

/** @private */
export function _debugKey(path: Readonly<ParsedKey>): string {
    return path.length ? 'key ' + JSON.stringify(stringifyKey(path)) : 'top level';
}

export default stringifyKey;
