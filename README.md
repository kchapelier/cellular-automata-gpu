# cellular-automata-gpu

## Installing and testing

With [npm](http://npmjs.org) do:

```
npm install cellular-automata-gpu
```

To run the test suite, run the following command from the ```cellular-automata-gpu``` directory:

```
npm test
```

## Features

- Doesn't have any dependency to the DOM (use [gl](https://www.npmjs.com/package/gl) when used in node)
- Can easily apply different successive rules.
- Can be used in any dimension (1D, 2D, 3D and more).
- Allow the cellular automata rules to be passed as a string in one of several common CA rule format, see [cellular-automata-rule-parser](https://www.npmjs.com/package/cellular-automata-rule-parser).

## Warning

It is currently recommended to use the CPU-based module [cellular-automata](https://www.npmjs.com/package/cellular-automata) instead as it is more battle-tested, more documented and not subject to GPU drivers bugs, albeit much slower.

## Changelog

0.0.2 (2017-01-13) :

- Fix incorrect shader generation for stochastic rule in 3D
- Fix issue with empty birth of survival value in stochastic rules

0.0.1 (2016-12-17) :

- First publication on npm.

## License

MIT
