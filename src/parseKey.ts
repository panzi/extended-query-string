import { KeySyntaxError } from "./errors.js";
import type { ParsedKey } from "./types.js";

/**
 * Parse an extended query string key.
 * 
 * They passed {@link key} is already to be %-decoded.
 * 
 * The returned {@link ParsedKey} is an array that has strings for mapping-keys
 * and `null` for array positions.
 * 
 * @throws {KeySyntaxError} Thrown if there are unbalanced brackets or anything but
 * a `[` after a `]`.
 */
export function parseKey(key: string): ParsedKey {
    let openIndex = key.indexOf('[');
    if (openIndex < 0) {
        const closeIndex = key.indexOf(']');
        if (closeIndex >= 0) {
            throw new KeySyntaxError(key, closeIndex, '<identifier>', ']');
        }
        return [key];
    }

    // The first segment is always a mapping-key, even if it's the empty string.
    const path: ParsedKey = [key.slice(0, openIndex)];

    let closeIndex = -1;

    for (;;) {
        const newCloseIndex = key.indexOf(']', closeIndex + 1);
        if (newCloseIndex < 0) {
            throw new KeySyntaxError(key, key.length, ']', null);
        }

        if (newCloseIndex < openIndex) {
            throw new KeySyntaxError(key, newCloseIndex, '<identifier>', ']');
        }

        closeIndex = newCloseIndex;

        const nextKey = key.slice(openIndex + 1, closeIndex);
        const index = nextKey.indexOf('[');
        if (index >= 0) {
            throw new KeySyntaxError(key, openIndex + 1 + index, '<identifier>', '[');
        }

        path.push(nextKey || null);

        openIndex = closeIndex + 1;

        if (openIndex === key.length) {
            break;
        }

        const char = key.charAt(openIndex);
        if (char !== '[') {
            throw new KeySyntaxError(key, openIndex, '[', char || null);
        }
    }

    return path;
}

export default parseKey;
