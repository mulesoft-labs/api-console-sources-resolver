'use strict';

const {ApiConsoleSources} = require('../lib/api-console-sources');
const {ApiConsoleTransport} = require('@api-components/api-console-github-resolver');
const assert = require('chai').assert;
const fs = require('fs-extra');
const winston = require('winston');

function createLogger() {
  const format = winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  );
  return winston.createLogger({
    level: 'warning',
    format,
    exitOnError: false,
    transports: [
      new winston.transports.Console()
    ]
  });
}

const zipUrl = 'https://github.com/mulesoft/api-console/archive/5.0.0-preview.zip';

const tagInfo = {
  tag_name: '5.0.0-preview',
  zipball_url: 'test'
};

const githubResolver = {
  getLatestInfo: function() {
    return Promise.resolve(tagInfo);
  },

  getTagInfo: function() {
    return Promise.resolve(tagInfo);
  }
};

const githubTransport = {
  get: function(url) {
    if (url.indexOf('http') === -1) {
      return fs.readFile('test/test.zip');
    }
    const transport = new ApiConsoleTransport(createLogger());
    return transport.get(url, {
      'user-agent': 'mulesoft-labs/api-console-sources-resolver'
    });
  }
};

describe('sources-resolver', () => {
  describe('constructor', () => {
    it('Should construct object', function() {
      const sources = new ApiConsoleSources({
        logger: createLogger()
      },
        githubResolver, githubTransport);
      assert.isOk(sources);
    });

    it('Should throw validation error', function() {
      assert.throws(function() {
        new ApiConsoleSources({
          test: true
        }, githubResolver, githubTransport, createLogger());
      });
    });
  });

  describe('_copyLocal()', () => {
    describe('Zip file', () => {
      let resolver;
      let options;
      const dest = 'test/build/';
      before(function() {
        options = {
          src: 'test/test.zip',
          logger: createLogger()
        };
        resolver = new ApiConsoleSources(options,
          githubResolver, githubTransport, createLogger());
      });

      afterEach(function() {
        return fs.remove(dest);
      });

      it('Should copy sources from zip file', () => {
        return resolver._copyLocal(options.src, dest)
        .then(() => {
          return fs.pathExists(dest);
        })
        .then((result) => {
          assert.isTrue(result);
        });
      });

      it('Should copy contents from first level directory', () => {
        return resolver._copyLocal(options.src, dest)
        .then(() => {
          return fs.pathExists(dest + '/api-console.html');
        })
        .then((result) => {
          assert.isTrue(result);
        });
      });
    });

    describe('Source folder', () => {
      let resolver;
      let options;
      const dest = 'test/build/';
      before(function() {
        options = {
          src: 'test/api-console',
          logger: createLogger()
        };
        resolver = new ApiConsoleSources(options,
          githubResolver, githubTransport, createLogger());
      });

      afterEach(function() {
        return fs.remove(dest);
      });

      it('Should copy sources to a destination', () => {
        return resolver._copyLocal(options.src, dest)
        .then(() => {
          return fs.pathExists(dest + 'api-console.html');
        })
        .then((result) => {
          assert.isTrue(result);
        });
      });
    });
  });

  describe('_downloadLatest()', () => {
    let resolver;
    const dest = 'test/build/';
    before(function() {
      resolver = new ApiConsoleSources({
        logger: createLogger()
      },
        githubResolver, githubTransport);
    });

    afterEach(function() {
      return fs.remove(dest);
    });

    it('Should copy sources to a destination', () => {
      return resolver._downloadLatest(dest)
      .then(() => {
        return fs.pathExists(dest + 'api-console.html');
      })
      .then((result) => {
        assert.isTrue(result);
      });
    });
  });

  describe('_downloadTagged()', () => {
    let resolver;
    const dest = 'test/build/';
    before(function() {
      resolver = new ApiConsoleSources({
        logger: createLogger()
      },
        githubResolver, githubTransport);
    });

    afterEach(function() {
      return fs.remove(dest);
    });

    it('Should copy sources to a destination', () => {
      return resolver._downloadTagged('v5.0.0', dest)
      .then(() => {
        return fs.pathExists(dest + 'api-console.html');
      })
      .then((result) => {
        assert.isTrue(result);
      });
    });
  });

  describe('_downloadAny()', () => {
    let resolver;
    const dest = 'test/build/';
    before(function() {
      resolver = new ApiConsoleSources({
        logger: createLogger()
      },
        githubResolver, githubTransport);
    });

    afterEach(function() {
      return fs.remove(dest);
    });

    it('Should copy sources to a destination', function() {
      this.timeout(15000); // Download time.
      return resolver._downloadAny(zipUrl, dest)
      .then(() => {
        return fs.pathExists(dest + 'api-console.html');
      })
      .then((result) => {
        assert.isTrue(result);
      });
    });
  });

  describe('sourcesTo()', () => {
    const stub = {
      _c1: false,
      _c2: false,
      _c3: false,
      _c4: false,
      _downloadLatest: function() {
        this._c1 = true;
      },
      _downloadTagged: function() {
        this._c2 = true;
      },
      _downloadAny: function() {
        this._c3 = true;
      },
      _copyLocal: function() {
        this._c4 = true;
      }
    };
    /**
     * @param {Object} obj
     * @return {Object}
     */
    function makeStub(obj) {
      obj = Object.assign(obj, stub);
      return obj;
    }

    it('Should download latest release', function() {
      let resolver = new ApiConsoleSources({
        logger: createLogger()
      },
        githubResolver, githubTransport);
      resolver = makeStub(resolver);
      resolver.sourcesTo();
      assert.isTrue(resolver._c1);
    });

    it('Should download tagged release', function() {
      let resolver = new ApiConsoleSources({
        tagName: 'v5.0.0',
        logger: createLogger()
      }, githubResolver, githubTransport);
      resolver = makeStub(resolver);
      resolver.sourcesTo();
      assert.isTrue(resolver._c2);
    });

    it('Should download from any URL', function() {
      let resolver = new ApiConsoleSources({
        src: zipUrl,
        logger: createLogger()
      }, githubResolver, githubTransport);
      resolver = makeStub(resolver);
      resolver.sourcesTo();
      assert.isTrue(resolver._c3);
    });

    it('Should download from any URL', function() {
      let resolver = new ApiConsoleSources({
        src: 'test/test.zip',
        logger: createLogger()
      }, githubResolver, githubTransport);
      resolver = makeStub(resolver);
      resolver.sourcesTo();
      assert.isTrue(resolver._c4);
    });
  });
});
