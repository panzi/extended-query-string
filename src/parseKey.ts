export function parseKey(key: string): string[] {
    let openIndex = key.indexOf('[');
    if (openIndex < 0) {
        const closeIndex = key.indexOf(']');
        if (closeIndex >= 0) {
            throw new SyntaxError(`Syntax error at index ${closeIndex}: unexpected "]" (expected identifier character): ${JSON.stringify(key)}`);
        }
        return [key];
    }

    const path: string[] = [key.slice(0, openIndex)];

    let closeIndex = -1;

    for (;;) {
        const newCloseIndex = key.indexOf(']', closeIndex + 1);
        if (newCloseIndex < 0) {
            throw new SyntaxError(`Syntax error at index ${key.length}: unexpected end of string (expected "]"): ${JSON.stringify(key)}`);
        }

        if (newCloseIndex < openIndex) {
            throw new SyntaxError(`Syntax error at index ${newCloseIndex}: unexpected "]" (expected identifier character): ${JSON.stringify(key)}`);
        }

        closeIndex = newCloseIndex;

        const nextKey = key.slice(openIndex + 1, closeIndex);
        const index = nextKey.indexOf('[');
        if (index >= 0) {
            throw new SyntaxError(`Syntax error at index ${openIndex + 1 + index}: unexpected "[" (expected identifier character): ${JSON.stringify(key)}`);
        }

        path.push(nextKey);

        openIndex = closeIndex + 1;

        if (openIndex === key.length) {
            break;
        }

        const char = key.charAt(openIndex);
        if (char !== '[') {
            throw new SyntaxError(`Syntax error at index ${openIndex}: unexpected ${JSON.stringify(char)} (expected "["): ${JSON.stringify(key)}`);
        }
    }

    return path;
}

export default parseKey;
