const {ApiConsoleCache} = require('../lib/api-console-cache');
const assert = require('chai').assert;
const fs = require('fs-extra');
const path = require('path');

const logger = {
  error: function() {},
  warn: function() {},
  info: function() {},
  log: function() {},
  debug: function() {}
};

describe('console-cache', () => {
  describe('locateAppDir()', () => {
    let cache;
    before(function() {
      cache = new ApiConsoleCache(logger);
    });

    it('Sets cacheFolder property', () => {
      assert.typeOf(cache.cacheFolder, 'string');
    });

    it('cacheFolder property contains sources path', () => {
      const loc = path.join('api-console', 'cache', 'sources');
      assert.isAbove(cache.cacheFolder.indexOf(loc), 1);
    });
  });

  describe('_tagToName()', () => {
    it('Replaces "v" in tag name', () => {
      const cache = new ApiConsoleCache(logger);
      const result = cache._tagToName('v5.0.0');
      assert.equal(result, '5.0.0');
    });

    it('Keeps snapshot name', () => {
      const cache = new ApiConsoleCache(logger);
      const result = cache._tagToName('5.0.0-preview');
      assert.equal(result, '5.0.0-preview');
    });
  });

  describe('cachedPath()', () => {
    let cache;
    before(() => {
      cache = new ApiConsoleCache(logger);
      const file = path.join(cache.cacheFolder, '5.0.0.zip');
      return fs.ensureFile(file);
    });
    after(() => {
      return fs.remove(cache.cacheFolder);
    });

    it('Returns location of cached file', () => {
      return cache.cachedPath('5.0.0')
      .then((location) => {
        const loc = path.join('api-console', 'cache', 'sources', '5.0.0.zip');
        assert.isAbove(location.indexOf(loc), 1);
      });
    });

    it('Normalizes tag name', () => {
      return cache.cachedPath('v5.0.0')
      .then((location) => {
        const loc = path.join('api-console', 'cache', 'sources', '5.0.0.zip');
        assert.isAbove(location.indexOf(loc), 1);
      });
    });

    it('Returns undefined iof not found', () => {
      return cache.cachedPath('105')
      .then((location) => {
        assert.isUndefined(location);
      });
    });
  });

  describe('cachedPath()', () => {
    let cache;
    const buf = Buffer.from('test');
    beforeEach(() => {
      cache = new ApiConsoleCache(logger);
    });

    afterEach(() => {
      return fs.remove(cache.cacheFolder);
    });

    it('Creates cache folder', () => {
      return cache.write(buf, 'v5.0.0')
      .then(() => {
        return fs.pathExists(cache.cacheFolder);
      })
      .then((exists) => assert.isTrue(exists));
    });

    it('Creates cache file', () => {
      return cache.write(buf, 'v5.0.0')
      .then(() => {
        const loc = path.join(cache.cacheFolder, '5.0.0.zip');
        return fs.pathExists(loc);
      })
      .then((exists) => assert.isTrue(exists));
    });
  });
});
