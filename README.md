# cellular-automata-gpu

## Installing and testing

With [npm](http://npmjs.org) do:

```
npm install cellular-automata-gpu
```

## Features

- Doesn't have any dependency to the DOM (use OffscreenCanvas in worker if available).
- Can easily apply different successive rules.
- Can be used in 2D and 3D.
- Allow the cellular automata rules to be passed as a string in one of several common CA rule format, see [cellular-automata-rule-parser](https://www.npmjs.com/package/cellular-automata-rule-parser).

## Warning

It is currently recommended to use the CPU-based module [cellular-automata](https://www.npmjs.com/package/cellular-automata) instead as it is more battle-tested, more documented and not subject to GPU drivers bugs, albeit much slower.

## Changelog

### 0.1.0 (2019-04-27) :

- Now use a WebGL2 backend
- Does not work in node.js anymore (no stable headless WebGL2 implementation as of yet)
- More consistent behavior on different GPUs
- Update dependencies, remove dependency to `uniq` and `gl`
- Smaller npm package

### 0.0.2 (2017-01-13) :

- Fix incorrect shader generation for stochastic rule in 3D
- Fix issue with empty birth or survival value in stochastic rules

### 0.0.1 (2016-12-17) :

- First publication on npm.

## License

MIT
