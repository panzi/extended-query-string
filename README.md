Extended Query String
=====================

[![Test Status](https://img.shields.io/github/actions/workflow/status/panzi/extended-query-string/tests.yml)](https://github.com/panzi/extended-query-string/actions/workflows/tests.yml)
[![Release](https://img.shields.io/github/v/tag/panzi/extended-query-string)](https://github.com/panzi/extended-query-string/tags)
[![MIT License](https://img.shields.io/github/license/panzi/extended-query-string)](https://github.com/panzi/extended-query-string/blob/main/LICENSE)
[![API Reference](https://img.shields.io/badge/API_Reference-informational)](https://panzi.github.io/extended-query-string)

Parse and stringify extended query strings, similar to the `extended` query
parser option of [expressjs](https://expressjs.com/),
[body-parser](https://github.com/expressjs/body-parser#readme),
[qs](https://www.npmjs.com/package/qs#readme),
[Ruby on Rails](https://rubyonrails.org/), etc.

Features, some of which making it different to these:

* Simpler code with zero dependencies. (Except for dev dependencies, of course.)
* Strict parsing that throws exceptions if there is:

  * Illegal syntax in keys
  * Illegal %-encoding
  * Illegal array indices: For each new array element the condition
    `0 <= index <= array.length` must hold.
  * Conflicting types (mapping Vs array)
  * Redefinition of keys

  Though exceptions can be turned off, simply dropping any broken parameters.
* Strict stringification that throws exceptions if there are:

  * Circular structures
  * Illegal keys (mapping keys containing `[` or `]` or non-top level empty keys)

  Again, exceptions can be turned off, simply dropping any broken parameters.
* Uses `Object.create(null)` for parsed objects that really only have the
  parsed properties. This alone would already prevent prototype pollution, though
  `Object.hasOwn()` is used anyway.
* Faster in my very limited [micro-benchmark](benchmark/README.md).

Note that this library doesn't provide limits (`depth`, `parameterLimit`,
`arrayLimit`) like [qs](https://www.npmjs.com/package/qs#readme) does.
Instead limit the size of the query string that is accepted.

### Query String Example

```TypeScript
import qs from "@panzi/extended-query-string";

console.log(qs.stringify({
  "mapping": {
    "foo": "A",
    "bar": {
      "baz": "B",
    }
  },
  "array": [
    "C",
    [ "D" ]
  ]
}));
```

Output:

```
mapping%5Bfoo%5D=A&mapping%5Bbar%5D%5Bbaz%5D=B&array%5B0%5D=C&array%5B1%5D%5B0%5D=D
```

Output without %-encoding for readability:

```
mapping[foo]=A&mapping[bar][baz]=B&array[0]=C&array[1][0]=D
```

Syntax
------

**NOTE:** Keys cannot contain `[` or `]`. %-encoding does *not* escape these
characters.

```BNF
‹query› ::= ‹param› { "&" ‹param› }
‹param› ::= percent-encoded( ‹key› ) [ "=" percent-encoded( ‹value› ) ]
‹key›   ::= ‹prop> { "[" ‹prop› "]" }
‹prop›  ::= { not "[" or "]" }
‹value› ::= { any character }
```

### Example Keys

* `foo`
* `foo[bar]`
* `foo[bar][baz]`
* `foo[]`
* `foo[][]`
* `foo[0]`
* `foo[1][0]`
* `foo bar[][123 $ B_Ä.Z]`
* `[]` - In this case the key in the top level mapping is the empty string (`""`).

### Negative Example Keys

These are syntax errors.

* `foo[`
* `foo]`
* `foo[[]`
* `foo[]]`
* `foo[]bar`
* `foo[]bar[baz]`
* `foo[bar] [baz]`
