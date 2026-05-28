export function stringifyKey(path: readonly (string|null)[]): string {
    const buf = [path[0] ?? ''];
    for (let index = 1; index < path.length; ++index) {
        buf.push('[', path[index] ?? '', ']');
    }

    return buf.join('');
}

/** @private */
export function _debugKey(path: readonly (string|null)[]): string {
    return path.length ? 'key ' + JSON.stringify(stringifyKey(path)) : 'top level';
}

export default stringifyKey;
