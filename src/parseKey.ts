import { KeySyntaxError } from "./errors.js";
import type { ParsedKey } from "./types.js";

// RegExp is faster in Firefox, manual iterating is faster in Brave.
// I don't know what is faster on JavaScriptCore.
// /^[0-9]+$/ is faster than /^\d+$/
// i < text.length is faster than n = text.length; i < n
// See: https://jsbm.dev/myojw6PWlWS3N
const INT_PATTERN: { test(text: string): boolean } = (
    typeof navigator !== 'undefined' && navigator?.userAgent?.includes?.('Gecko/') ?
        /^[0-9]+$/ : {
        test(text: string): boolean {
            if (!text.length) return false;
            for (let index = 0; index < text.length; ++ index) {
                const ch = text.charCodeAt(index);
                if (ch < 0x30 || ch > 0x39) {
                    return false;
                }
            }
            return true;
        }
    }
);

/**
 * Parse an extended query string key.
 * 
 * They passed {@link key} is already to be %-decoded.
 * 
 * The returned {@link ParsedKey} is an array that has strings for mapping-keys
 * and `null` for array positions.
 * 
 * @throws {@link KeySyntaxError} Thrown if there are unbalanced brackets or anything but
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

        path.push(INT_PATTERN.test(nextKey) ? parseInt(nextKey, 10) : nextKey || null);

        openIndex = closeIndex + 1;

        if (openIndex === key.length) {
            break;
        }

        const char = key.charCodeAt(openIndex);
        if (char !== 0x5B) {
            throw new KeySyntaxError(key, openIndex, '[', key.charAt(openIndex) || null);
        }
    }

    return path;
}

export default parseKey;
