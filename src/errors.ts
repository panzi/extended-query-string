import { _debugKey } from "./stringifyKey";
import type { ParsedKey, TypeName } from "./types";

export class ExtendedQueryStringError extends Error {
    constructor(message?: string, options?: ErrorOptions) {
        super(message, options);
        this.name = this.constructor.name;
    }
}

export class CircularStructureError extends ExtendedQueryStringError {
    firstKey: ParsedKey;
    secondKey: ParsedKey;

    constructor(firstKey: ParsedKey, secondKey: ParsedKey, options?: ErrorOptions) {
        super(`Cannot stringify circular structure! Found same object at ${_debugKey(firstKey)} and at ${_debugKey(secondKey)}`, options);
        this.firstKey = firstKey;
        this.secondKey = secondKey;
    }
}

export class ParserError extends ExtendedQueryStringError {}

export class TypeConflict extends ParserError {
    key: ParsedKey;
    expectedType: TypeName;
    actualType: TypeName;

    constructor(key: ParsedKey, expectedType: TypeName, actualType: TypeName, options?: ErrorOptions) {
        super(`Conflicting types at ${_debugKey(key)}: expected ${expectedType}, got ${actualType}`, options);
        this.key = key;
        this.expectedType = expectedType;
        this.actualType = actualType;
    }
}

export class RedefinitionError extends ParserError {
    key: ParsedKey;

    constructor(key: ParsedKey, options?: ErrorOptions) {
        super(`Redefined ${_debugKey(key)}`, options);
        this.key = key;
    }
}
