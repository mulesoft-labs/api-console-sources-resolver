const {ApiConsoleSources} = require('./lib/api-console-sources');
const {ApiConsoleTransport, ApiConsoleGithubResolver} =
  require('api-console-github-resolver');

const resolver = new ApiConsoleGithubResolver({
  minimumTagMajor: 4
});
const transport = new ApiConsoleTransport();
const logic = new ApiConsoleSources({
  tagVersion: 'v4.2.0'
}, resolver, transport, console);
logic.sourcesTo('./build')
.then(() => console.log('OK'))
.catch((e) => console.error(e));
