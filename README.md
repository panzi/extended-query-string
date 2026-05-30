Extended Query String
=====================

Parse and stringify extended query strings, similar to the `extended` query
parser option of [express](https://expressjs.com/),
[body-parser](https://github.com/expressjs/body-parser#readme),
[Ruby on Rails](https://rubyonrails.org/), etc.

The differences to other libraries like [qs](https://github.com/ljharb/qs#readme)
are:

* Simpler code with zero dependencies.
* Simpler supported syntax. E.g. in `foo[1]` the `1` is still a mapping key and
  not an array index. Only `[]` with noting between the brackets refers to an
  array key.
* Strict parsing that throws exceptions if there are:

  * Illegal syntax in keys
  * Conflicting types (mapping Vs array)
  * Redefintion of keys

  Though exceptions can be turned off, simply dropping any broken parameters.
* Uses `Object.create(null)` for parsed objects that really only have the
  parsed properties. This would also prevent prototype pollution, though
  `Object.hasOwn()` is used anyway.

Key Syntax
----------

**NOTE:** Keys cannot contain `[` or `]`. %-encoding does *not* escape these
characters.

```
KEY  := CHAR* ( "[" CHAR* "]" )*
CHAR := /* not "[" or "]" */
```

### Examples

* `foo`
* `foo[bar]`
* `foo[bar][baz]`
* `foo[]`
* `foo[][]`
* `foo bar[][123 $ B_Ä.Z]`
* `[]` - In this case the key in the top level mapping is the empty string (`""`).

### Negative Examples

These are syntax errors.

* `foo[`
* `foo]`
* `foo[[]`
* `foo[]]`
* `foo[]bar`
* `foo[]bar[baz]`
* `foo[bar] [baz]`

TODO
----

More tests.
