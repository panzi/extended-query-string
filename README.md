Extended Query String
=====================

Parse and stringify extended query strings, like the `extended` query parser
option of [express](https://expressjs.com/),
[body-parser](https://github.com/expressjs/body-parser#readme),
[Ruby on Rails](https://rubyonrails.org/), and similar.

The differences to other libraries like [qs](https://github.com/ljharb/qs#readme)
are:

* Simpler code with zero dependencies.
* Strict parsing that throws exceptions on syntax errors instead of doing
  unexpected things.
* Uses `Object.create(null)` for parsed objects that really only have the
  parsed properties. This would also prevent prototype pollution, though
  `Object.hasOwn()` is used anyway.

TODO
----

Tests.
