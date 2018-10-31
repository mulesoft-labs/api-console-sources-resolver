# api-console-sources-resolver

[![Build Status](https://travis-ci.org/mulesoft-labs/api-console-sources-resolver.svg?branch=master)](https://travis-ci.org/mulesoft-labs/api-console-sources-resolver)

## API

The module exposes 2 classes:

-   [ApiConsoleSources](lib/api-console-sources.js)
-   [ApiConsoleSourceOptions](lib/sources-options.js)

### Example

```javascript
const {ApiConsoleSources} = require('api-console-sources-resolver');
const {ApiConsoleTransport} = require('api-console-github-resolver');
const {ApiConsoleGithubResolver} = require('api-console-github-resolver');

const resolver = new ApiConsoleGithubResolver();
const transport = new ApiConsoleTransport();

const sources = new ApiConsoleSources({
  tagVersion: 'v4.0.0'
}, resolver, transport, console);

sources.sourcesTo('./temp/')
.then(() => console.log('Ready'))
.catch(cause => console.error(cause));
```

### ApiConsoleSources

A class responsible for getting API Console's correct sources and copy it to
desired location.

#### Constructor

**opts** [ApiConsoleSourceOptions](lib/sources-options.js)

**resolver** `Object` - A class used to resolve console's versions and download
release information

**transport** `Object` - Remote files downloader.

**logger** `Object` - A logger class. **Deprecated** Use `opts.logger` instead.

#### `sourcesTo(destination)`

Resolves and copies API console's sources from set in options source location to
`destination`.

Console can be downloaded from Mulesoft's main repository as a latest release
or tagged release. It can be copied from a local path or downloaded as a zip
file. This is controlled by the options.

**destination** `String` - Local destination where copied or downloaded and
extracted files will be placed.

##### Returns `<Promise>`

A promise resolved when operation succeeded.

#### `moveConsoleToBower(workingDir)`

Copies API console main files to a location in it's `bower_components` directory.
This should be called when bower components were already installed.

Console's main files will be copied to `{workingDir}/bower_components/api-console/`.

**workingDir** `String` - Location of the API console sources.

##### Returns `<Promise>`

A promise resolved when operation succeeded.
