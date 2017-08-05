'use strict';

const {ApiConsoleSourceOptions} = require('../lib/sources-options.js');
const assert = require('chai').assert;

describe('sources-options', () => {

  describe('validateOptions()', () => {
    var options;

    describe('_validateOptionsList()', () => {
      beforeEach(function() {
        options = new ApiConsoleSourceOptions();
      });

      it('Should pass a known option', function() {
        options._validateOptionsList({
          tagVersion: 'test'
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

      it('Should fail for src and tagVersion', function() {
        options._validateSourceOptions({
          src: 'test',
          tagVersion: 'v1'
        });
        assert.isFalse(options.isValid);
        assert.lengthOf(options.validationWarnings, 0);
      });

      it('Should want for sourceIsZip and src not set', function() {
        options._validateSourceOptions({
          sourceIsZip: true
        });
        assert.isTrue(options.isValid);
        assert.lengthOf(options.validationWarnings, 1);
      });

      it('Should want for sourceIsZip and tagVersion set', function() {
        options._validateSourceOptions({
          sourceIsZip: true,
          tagVersion: 'v1'
        });
        assert.isTrue(options.isValid);
        assert.lengthOf(options.validationWarnings, 2);
      });

      it('Passes valid src', function() {
        options._validateSourceOptions({
          src: 'test'
        });
        assert.isTrue(options.isValid);
        assert.lengthOf(options.validationWarnings, 0);
      });

      it('Passes valid tagVersion', function() {
        options._validateSourceOptions({
          tagVersion: 'test'
        });
        assert.isTrue(options.isValid);
        assert.lengthOf(options.validationWarnings, 0);
      });

      it('Passes valid src and sourceIsZip', function() {
        options._validateSourceOptions({
          src: 'test',
          sourceIsZip: true
        });
        assert.isTrue(options.isValid);
        assert.lengthOf(options.validationWarnings, 0);
      });
    });
  });

  describe('Default options', () => {
    var options;

    before(function() {
      options = new ApiConsoleSourceOptions();
    });

    it('Should not set src default option', function() {
      assert.isUndefined(options.src);
    });

    it('Should set sourceIsZip default option', function() {
      assert.isFalse(options.sourceIsZip);
    });
  });
});
