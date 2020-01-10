# api-console-sources-resolver

[![Build Status](https://travis-ci.org/mulesoft-labs/api-console-sources-resolver.svg?branch=master)](https://travis-ci.org/mulesoft-labs/api-console-sources-resolver)

A module that takes care of copying API Console's sources to a working dir from various sources like GitHub release, any URL, or local filesystem.

## API

The module exposes the following classes:

-   [SourcesResolver](lib/SourcesResolver.js)
-   [SourceOptions](lib/SourceOptions.js)
-   [Cache](lib/Cache.js)

### Example

```javascript
import { SourcesResolver } from '@api-components/api-console-sources-resolver';
import { Transport, GithubResolver } from '@api-components/api-console-github-resolver';

const resolver = new GithubResolver();
const transport = new Transport();

const sources = new SourcesResolver({
  tagVersion: 'v6.0.0'
}, resolver, transport, console);

await sources.sourcesTo('./temp/');
```

### SourcesResolver

A class responsible for getting API Console's correct sources and copy it to
desired location.

#### Constructor

**opts** [SourceOptions](lib/SourceOptions.js)

**resolver** `Object` - A class used to resolve console's versions and download
release information

**transport** `Object` - Remote files downloader.

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
