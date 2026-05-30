export type Query = Record<string, unknown>;

/**
 * `null` means that this position is an array.
 */
export type ParsedKey = (string|null)[];

export type TypeName = "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "null" | "mapping" | "array" | "function";

export function getTypeName(value: unknown): TypeName {
    if (value === null) {
        return 'null';
    }

    if (Array.isArray(value)) {
        return 'array';
    }

    const typeName = typeof value;

    if (typeName === 'object') {
        return 'mapping';
    }

    return typeName;
}
