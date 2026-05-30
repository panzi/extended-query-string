import { _debugKey } from "./stringifyKey";
import type { ParsedKey, TypeName } from "./types";

export class ExtendedQueryStringError extends Error {
    constructor(message?: string, options?: ErrorOptions) {
        super(message, options);
        this.name = this.constructor.name;
    }
}

export class StringifyError extends ExtendedQueryStringError {}

export class IllegalKeyError extends StringifyError {
    key: string;

    constructor(key: string, options?: ErrorOptions) {
        super(`Illegal mapping key: ${JSON.stringify(key)}`, options);
        this.key = key;
    }
}

export class CircularStructureError extends StringifyError {
    firstKey: ParsedKey;
    secondKey: ParsedKey;

    constructor(firstKey: ParsedKey, secondKey: ParsedKey, options?: ErrorOptions) {
        super(`Cannot stringify circular structure! Found same object at ${_debugKey(firstKey)} and at ${_debugKey(secondKey)}`, options);
        this.firstKey = firstKey;
        this.secondKey = secondKey;
    }
}

export class ParseError extends ExtendedQueryStringError {}

export class TypeConflict extends ParseError {
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

export class RedefinitionError extends ParseError {
    key: ParsedKey;

    constructor(key: ParsedKey, options?: ErrorOptions) {
        super(`Redefined ${_debugKey(key)}`, options);
        this.key = key;
    }
}
