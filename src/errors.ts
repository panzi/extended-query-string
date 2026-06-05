import { _debugKey } from "./stringifyKey.js";
import type { ParsedKey, TypeName } from "./types.js";
import type { parse, stringify } from '.';
import type { parseKey } from './parseKey.js';

/**
 * Base class for all exceptions thrown by this library.
 */
export class ExtendedQueryStringError extends Error {
    constructor(message?: string, options?: ErrorOptions) {
        super(message, options);
        this.name = this.constructor.name;
    }
}

/**
 * Base class for all exceptions thrown by {@link stringify}.
 */
export class StringifyError extends ExtendedQueryStringError {}

/**
 * Thrown by {@link stringify} if a mapping key contains `[` or `]`, or if the
 * key is empty (`""`).
 */
export class IllegalKeyError extends StringifyError {
    /** The illegal key. */
    key: string;

    constructor(key: string, options?: ErrorOptions) {
        super(`Illegal mapping key: ${JSON.stringify(key)}`, options);
        this.key = key;
    }
}

/**
 * Thrown by {@link stringify} if a circular structure is found in the query
 * object passed to it.
 */
export class CircularStructureError extends StringifyError {
    /** First location where the circular object was found. */
    firstKey: ParsedKey;

    /** Second (nested) location where the circular object was found. */
    secondKey: ParsedKey;

    constructor(firstKey: ParsedKey, secondKey: ParsedKey, options?: ErrorOptions) {
        super(`Cannot stringify circular structure! Found same object at ${
            _debugKey(firstKey)} and at ${_debugKey(secondKey)}`, options);
        this.firstKey = firstKey;
        this.secondKey = secondKey;
    }
}

/**
 * Base class for all exceptions thrown by {@link parse} and {@link parseKey}.
 */
export class ParseError extends ExtendedQueryStringError {}

/**
 * Thrown by {@link parse} if two parameters expect different kinds of objects
 * (`mapping` Vs `array`) at the same location.
 */
export class TypeConflict extends ParseError {
    /** Key with the type conflict. */
    key: ParsedKey;

    /** Type expected by the currently parsed parameter. */
    expectedType: TypeName;

    /** Type that was already parsed previously. */
    actualType: TypeName;

    constructor(key: ParsedKey, expectedType: TypeName, actualType: TypeName, options?: ErrorOptions) {
        super(`Conflicting types at ${_debugKey(key)}: expected ${expectedType}, got ${
            actualType}`, options);
        this.key = key;
        this.expectedType = expectedType;
        this.actualType = actualType;
    }
}

/**
 * Thrown by {@link parse} if two parameters want to set the same leaf key.
 */
export class RedefinitionError extends ParseError {
    /** The key in question. */
    key: ParsedKey;

    constructor(key: ParsedKey, options?: ErrorOptions) {
        super(`Redefined ${_debugKey(key)}`, options);
        this.key = key;
    }
}

/**
 * Thrown by {@link parse} if an explicit array index is bigger than the length
 * of the array.
 * 
 * This prevents DoS attacks by passing `foo[134217727]=bar` as a query string.
 */
export class IllegalIndexError extends ParseError {
    /**  */
    key: ParsedKey;

    /** The length the array currently has. */
    length: number;

    constructor(key: ParsedKey, length: number, options?: ErrorOptions) {
        super(`The array index in ${_debugKey(key)} exceeds the allowed value of 0 <= index <= ${length}.`, options);
        this.key = key;
        this.length = length;
    }
}

/** Possibly expected symbols in {@link KeySyntaxError}. */
export type ExpectedSymbol = '['|']'|'<identifier>';

/**
 * Thrown by {@link parse} if there is an invalid key syntax.
 */
export class KeySyntaxError extends ParseError {
    /** The unparsed key in question. */
    key: string;

    /** Index in {@link key} at which the error occured. */
    index: number;

    /** The symbol that was expected. */
    expected: ExpectedSymbol;

    /**
     * The actual character at that {@link index}.
     * `null` if it is the end of the string.
     */
    actual: string|null;

    constructor(key: string, index: number, expected: ExpectedSymbol, actual: string|null, options?: ErrorOptions) {
        super(`Syntax error at index ${index}: unexpected ${
            actual === null ? '<EOF>' : JSON.stringify(actual)} (expected ${
            '[]'.includes(expected) ? JSON.stringify(expected) : expected}): ${
            JSON.stringify(key)}`, options);
        this.key = key;
        this.index = index;
        this.expected = expected;
        this.actual = actual;
    }
}

/**
 * Thrown by {@link parse} if there is broken %-encoding in any parameter.
 */
export class PercentEncodingError extends ParseError {
    /** The unparsed item (`<key>=<value>` pair) with the broken %-encoding. */
    item: string;

    constructor(item: string, options?: ErrorOptions) {
        super(`Borken %-encoding in query string item: ${JSON.stringify(item)}`, options);
        this.item = item;
    }
}
