'use strict';

const {ApiConsoleSourceOptions} = require('../lib/sources-options.js');
const assert = require('chai').assert;

describe('sources-options', () => {
  describe('validateOptions()', () => {
    let options;

    describe('_validateOptionsList()', () => {
      beforeEach(function() {
        options = new ApiConsoleSourceOptions();
      });

      it('Should pass known options', function() {
        options._validateOptionsList({
          tagName: 'test',
          src: '/',
          ignoreCache: false,
          verbose: true,
          logger: {}
        });
        assert.isTrue(options.isValid);
      });

      it('Should not pass a unknown option', function() {
        options._validateOptionsList({
          test: 'test'
        });
        assert.isFalse(options.isValid);
      });
    });

    describe('_validateSourceOptions()', () => {
      beforeEach(function() {
        options = new ApiConsoleSourceOptions();
      });

      it('Should fail for src and tagName', function() {
        options._validateSourceOptions({
          src: 'test',
          tagName: 'v1'
        });
        assert.isFalse(options.isValid);
        assert.lengthOf(options.validationWarnings, 0);
      });

      it('Passes valid src', function() {
        options._validateSourceOptions({
          src: 'test'
        });
        assert.isTrue(options.isValid);
        assert.lengthOf(options.validationWarnings, 0);
      });

      it('Passes valid tagName', function() {
        options._validateSourceOptions({
          tagName: 'test'
        });
        assert.isTrue(options.isValid);
        assert.lengthOf(options.validationWarnings, 0);
      });
    });
  });

  describe('Default options', () => {
    let options;

    before(function() {
      options = new ApiConsoleSourceOptions();
    });

    it('Should not set src default option', function() {
      assert.isUndefined(options.src);
    });

    it('Should set ignoreCache default option', function() {
      assert.isFalse(options.ignoreCache);
    });
  });
});
