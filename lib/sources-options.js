'use strict';
/**
 * Copyright (C) Mulesoft.
 * Shared under Apache 2.0 license
 *
 * @author Pawel Psztyc <pawel.psztyc@mulesoft.com>
 */
/**
 * Options object for the GithubResolver class.
 */
class ApiConsoleSourceOptions {
  /**
   * @constructor
   * @param {Object} opts User options.
   */
  constructor(opts) {
    opts = opts || {};
    this.validateOptions(opts);
    if (!this.isValid) {
      return;
    }
    opts = this._setDefaults(opts);

    /**
     * A release tag name to use. With this option the builder uses specific
     * release of the console. If not set and `src` is not set it uses latest
     * release. Note, only versions >= 4.0.0 can be used with this tool.
     *
     * @type {String}
     */
    this.tagVersion = opts.tagVersion;
    /**
     * Source directory for the API console.
     * If the `src` is an URL it expect to be a zip file that will
     * be uncopressed.
     * If it points to a local destination and it is a zip file, set
     * `sourceIsZip` option to true.
     *
     * Defaults to `undefined` and the it downloads the latest release of
     * the console.
     *
     * @type {String}
     */
    this.src = opts.src;
    /**
     * Set to true if the API console source (`this.src`) points to a zip
     * file that should be
     * uncopressed.
     *
     * If the `this.src` is an URL then it is be set to `true`.
     * Defaults to `false`.
     *
     * @type {Boolean}
     */
    this.sourceIsZip = opts.sourceIsZip;
    /**
     * Dowloaded packages are cached so it won't be downloaded each time.
     * Set this to true to ignore cached files.
     * @type {Boolean}
     */
    this.ignoreCache = opts.ignoreCache;
  }
  /**
   * @return {Array<String>} List of valid options keys
   */
  get validOptions() {
    return [
      'src', 'sourceIsZip', 'tagVersion', 'ignoreCache'
    ];
  }
  /**
   * @return {Boolean} `true` if passed config object is valid.
   */
  get isValid() {
    return this.validationErrors.length === 0;
  }

  /**
   * Validates user input options.
   * Sets `_validationErrors` and `_validationWarnings` arrays on this object
   * conteining corresponing messages.
   *
   * @param {Object} userOpts User options to check.
   */
  validateOptions(userOpts) {
    userOpts = userOpts || {};

    this.validationErrors = [];
    this.validationWarnings = [];

    this._validateOptionsList(userOpts);
    this._validateSourceOptions(userOpts);
  }
  /**
   * Sets default options on user proivided configuration.
   * @param {Object} opts
   * @return {Object}
   */
  _setDefaults(opts) {
    if (!('sourceIsZip' in opts)) {
      opts.sourceIsZip = false;
    }
    if (typeof opts.ignoreCache !== 'boolean') {
      opts.ignoreCache = false;
    }
    return opts;
  }
  /**
   * Validates of passed options matches `validOptions` list.
   * It set's `validationErrors` property if not valid.
   *
   * @param {Object} userOpts User configuration object.
   */
  _validateOptionsList(userOpts) {
    const keys = Object.keys(userOpts);
    const known = this.validOptions;
    const unknown = keys.filter((property) => known.indexOf(property) === -1);

    if (unknown.length) {
      let message = 'Unknown option';
      if (unknown.length > 1) {
        message += 's';
      }
      message += ': ' + unknown.join(', ');
      this.validationErrors.push(message);
    }
  }
  /**
   * Validates combination of `src` and `tagVersion`
   *
   * @param {Object} userOpts User configuration object.
   */
  _validateSourceOptions(userOpts) {
    if (userOpts.src && userOpts.tagVersion) {
      this.validationErrors.push(
        'The src and tagVersion are options are mutually exclusive. Choose ' +
        'only one option.'
      );
    }

    if (userOpts.sourceIsZip && !userOpts.src) {
      this.validationWarnings.push(
        'sourceIsZip is redundant when src is not set'
      );
    }

    if (userOpts.sourceIsZip && userOpts.tagVersion) {
      this.validationWarnings.push(
        'sourceIsZip is redundant when tagVersion is set'
      );
    }
  }
}
exports.ApiConsoleSourceOptions = ApiConsoleSourceOptions;
