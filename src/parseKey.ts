import { KeySyntaxError } from "./errors.js";
import type { ParsedKey } from "./types.js";

// This is faster than /^(0|[1-9][0-9]*)$/.test().
// See: https://jsbm.dev/LujuEBBc9RAlS
function isIndex(text: string): boolean {
    if (!text.length || text.length > 10) {
        return false;
    }

    const ch = text.charCodeAt(0);
    if (text.length === 1) {
        return ch >= 0x30 && ch <= 0x39;
    }

    if (ch < 0x31 || ch > 0x39) {
        return false;
    }

    for (let i = 1; i < text.length; ++ i) {
        const ch = text.charCodeAt(i);
        if (ch < 0x30 || ch > 0x39) {
            return false;
        }
    }

    return true;
}

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

        const startIndex = openIndex + 1;
        if (startIndex === closeIndex) {
            path.push(null);
        } else {
            const nextKey = key.slice(startIndex, closeIndex);
            const illegalOpenIndex = nextKey.indexOf('[');
            if (illegalOpenIndex >= 0) {
                throw new KeySyntaxError(key, startIndex + illegalOpenIndex, '<identifier>', '[');
            }

            if (isIndex(nextKey)) {
                const index = parseInt(nextKey, 10);
                if (index >= 0xFFFF_FFFF) {
                    path.push(nextKey);
                } else {
                    path.push(index);
                }
            } else {
                path.push(nextKey);
            }
        }

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
