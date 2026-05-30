/**
 * Mapping of complex objects representing a query.
 */
export type Query = Record<string, unknown>;

/**
 * `null` means that this position is an array.
 */
export type ParsedKey = (string|null)[];

/**
 * Helper type to debug errors.
 * 
 * The difference to `typeof` is that there is no `object` type name, but
 * instead there are `mapping`, `array`, and `null`.
 */
export type TypeName = "string" | "number" | "bigint" | "boolean" | "symbol" | "undefined" | "null" | "mapping" | "array" | "function";

/**
 * Helper function to debug errors.
 * 
 * The difference to `typeof` is that there is no `object` type name, but
 * instead there are `mapping`, `array`, and `null`.
 */
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
