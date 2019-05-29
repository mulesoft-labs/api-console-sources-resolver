'use strict';
/**
 * Copyright (C) Mulesoft.
 * Shared under Apache 2.0 license
 *
 * @author Pawel Psztyc <pawel.psztyc@mulesoft.com>
 */
const {ApiConsoleSourceOptions} = require('./sources-options');
const {ApiConsoleCache} = require('./api-console-cache');
const fs = require('fs-extra');
const path = require('path');
const unzipper = require('unzipper');
const tmp = require('tmp');
const winston = require('winston');
const githubHeaders = {
  'user-agent': 'mulesoft-labs/api-console-sources-resolver'
};
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
/**
 * A class responsible for getting the API Console's correct sources
 * and copy it to desired location.
 */
class ApiConsoleSources {
  /**
   * Constructs a builder.
   *
   * @param {ApiConsoleSourceOptions} opts Options passed to the module
   * @param {ApiConsoleGithubResolver} githubResolver A reference to
   * GithubResolver class instance.
   * @param {ApiConsoleTransport} transport A reference to ApiConsoleTransport.
   * It can be any object that has `get` method.
   * @param {Object} logger Logger to use to log debug output. It can be any
   * object that contains `log`, `info`, `warn`, `debug`, and `error` functions.
   * instance. This option is deprecated. Use `opts.logger` instead.
   */
  constructor(opts, githubResolver, transport, logger) {
    if (!(opts instanceof ApiConsoleSourceOptions)) {
      opts = new ApiConsoleSourceOptions(opts);
    }
    /**
     * @type {ApiConsoleSourceOptions}
     */
    this.opts = opts;
    /**
     * Looger object to be used to pring verbose or error messages.
     */
    this.logger = this._setupLogger(opts.logger || logger);
    if (!this.opts.isValid) {
      this._printValidationErrors();
      this._printValidationWarnings();
      throw new Error('Options did not passes validation.');
    }
    this._printValidationWarnings();
    this.githubResolver = githubResolver;
    this.transport = transport;
    this._cache = new ApiConsoleCache(opts.logger);
  }
  /**
   * Returns a logger object. Either passed object or `console` is used.
   *
   * @param {?Object} logger Logger to use instead of own one.
   * @return {Object}
   */
  _setupLogger(logger) {
    if (logger) {
      return logger;
    }
    const level = this.opts.verbose ? 'debug' : 'warn';
    const format = winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    );
    return winston.createLogger({
      level,
      format,
      exitOnError: false,
      transports: [
        new winston.transports.Console()
      ]
    });
  }
  /**
   * Prints varidation errors into the console via passed/created logger.
   */
  _printValidationErrors() {
    this.opts.validationErrors.forEach((error) => {
      this.logger.error(error);
    });
  }
  /**
   * Prints warning messages related to validation.
   */
  _printValidationWarnings() {
    const warnings = this.opts.validationWarnings;
    if (!warnings || !warnings.length) {
      return;
    }
    warnings.forEach((warning) => {
      this.logger.warn(warning);
    });
  }
  /**
   * Resolves and copies API console's sources from set in options source
   * to `destination`.
   *
   * Console can be downloaded from mulesoft main repository as a latest release
   * or tagged release.
   * It can be copied from a local path or downloaded from a zip file.
   * This can be controlled by the options.
   *
   * @param {String} destination A place where to copy the console.
   * @return {Promise}
   */
  sourcesTo(destination) {
    // define a flow.
    const tag = this.opts.tagName;
    const src = this.opts.src;
    this.isGithubRelease = tag || (!tag && !src);
    this.isDownload = src && src.indexOf('http') === 0;
    let promise;
    if (!tag && !src) {
      promise = this._downloadLatest(destination);
    } else if (tag) {
      promise = this._downloadTagged(tag, destination);
    } else if (this.isDownload) {
      promise = this._downloadAny(src, destination);
    } else {
      promise = this._copyLocal(src, destination);
    }
    return promise;
  }
  /**
   * Copy locally store API Console sources.
   * The `from` can be either directory to copy contents from or a zip file.
   *
   * @param {String} from Location of the sources.
   * @param {String} to Destination where to copy the files.
   * @return {Promise} Promise resolved when all files were copied.
   */
  _copyLocal(from, to) {
    this.logger.debug('Copying local API Console files to the working dir.');
    return fs.stat(from)
    .then((stats) => {
      if (stats.isFile()) {
        return this._openZipFile(from, to)
        .then((fd) => this._processZip(fd, to));
      }
      const src = path.resolve(process.cwd(), from);
      this.logger.debug('Copying files from ' + src);
      return fs.copy(src + '/', to);
    });
  }
  /**
   * Downloads information about latest release, downloads content of the
   * release, unzips the file and copies content to the destination.
   *
   * @param {String} destination A place where to place unzipped files.
   * @return {Promise} Promise resolved when all files were copied to the
   * `destination`.
   * The promise will reject when:
   *
   * - GitHub rate limit has been exceeded
   * - Couldn't download either release information or the zip file
   * - Couldn't process downloaded sources.
   */
  _downloadLatest(destination) {
    this.logger.debug('Downloading latest release info...');
    return this.githubResolver.getLatestInfo()
    .then((info) => this._downloadFromReleaseInfo(info, destination));
  }
  /**
   * Downloads information about tagged release, downloads content of the
   * release, unzips the file and copies content to the destination.
   *
   * @param {String} tag Release tag name.
   * @param {String} destination A place where to place unzipped files.
   * @return {Promise} Promise resolved when all files were copied to the
   * `destination`.
   * The promise will reject when:
   *
   * - GitHub rate limit has been exceeded
   * - Release number is lower than 4.0.0
   * - The tag doesn't exists
   * - Couldn't download either release information or the zip file
   * - Couldn't process downloaded sources.
   */
  _downloadTagged(tag, destination) {
    this.logger.debug('Getting ' + tag + ' release info...');
    return this.githubResolver.getTagInfo(tag)
    .then((info) => this._downloadFromReleaseInfo(info, destination));
  }
  /**
   * Getys console sources from release info (GitHub data model)
   *
   * @param {Object} release GitHub release data model
   * @param {String} destination Unzip destination
   * @return {Promise}
   */
  _downloadFromReleaseInfo(release, destination) {
    const tagName = release.tag_name;
    return this._cache.cachedPath(tagName)
    .then((location) => {
      if (location) {
        this.logger.debug('Reusing cached console sources...');
        return fs.open(location, 'r')
        .then((fd) => this._processZip(fd, destination));
      }
      let zipUrl = release.zipball_url;
      this.logger.debug('Downloading release tagged as: ' + tagName);
      return this._downloadAndProcess(zipUrl, destination, tagName);
    });
  }
  /**
   * Downloads api console from any source.
   *
   * @param {String} from The URL of the API console source zip file.
   * @param {String} destination A place where to place unzipped files.
   * @return {Promise} Promise resolved when all files were copied to the
   * `destination`.
   * The promise will reject when:
   *
   * - Couldn't download the zip file
   * - Couldn't process downloaded sources.
   */
  _downloadAny(from, destination) {
    this.logger.debug('Downloading API Console sources from ' + from);
    return this._downloadAndProcess(from, destination);
  }
  /**
   * Downloads an proceses the API Console sources zip file from a remote
   * location.
   *
   * @param {String} url An URL from where to download file. It must be secure
   * location.
   * @param {String} destination A place where to place unzipped files.
   * @param {?String} tag Tag name
   * @return {Promise} Promise resolved when all files were copied to the
   * `destination`.
   */
  _downloadAndProcess(url, destination, tag) {
    return this.transport.get(url, githubHeaders)
    .then((buffer) => this._writeDownloadedSources(buffer, tag))
    .then((fd) => this._processZip(fd, destination));
  }
  /**
   * Opens the zip file to read.
   * @param {String} source A path to a file.
   * @return {Promise} Resolved to a file descriptor.
   */
  _openZipFile(source) {
    this.logger.debug('Opening local zip file of the console.');
    return fs.open(source, 'r');
  }
  /**
   * Unzips files from the zip file and copy them to the destination folder.
   *
   * @param {Number} fd File descriptor of opened zip file.
   * @param {String} destination Folder where to put the files.
   * @return {Promise}
   */
  _processZip(fd, destination) {
    return new Promise((resolve, reject) => {
      fs.createReadStream(undefined, {
        fd: fd
      })
      .pipe(unzipper.Extract({path: destination}))
      .on('close', () => {
        this.logger.debug('Zip file has been extracted.');
        resolve(this._removeZipMainFolder(destination));
      })
      .on('error', function() {
        reject(new Error('Unable to unzip the API console sources'));
      });
    });
  }

  /**
   * GitHub's zip (and possibly others too) will have source files enclosed in
   * a folder.
   * This will look for a folder in the root path and will copy sources from it.
   *
   * @param {String} destination A place where the zip sources has been
   * extracted.
   * @return {Promise}
   */
  _removeZipMainFolder(destination) {
    return fs.readdir(destination)
    .then((files) => {
      if (files.length > 1) {
        return Promise.resolve();
      }
      const dirPath = path.join(destination, files[0]);
      return fs.stat(dirPath)
      .then((stats) => {
        if (stats.isDirectory()) {
          return fs.copy(dirPath, destination);
        }
      });
    });
  }
  /**
   * Caches sources (if possible) and writes downloaded data to a
   * temportaty file.
   *
   * @param {buffer} buffer Downloaded data buffer.
   * @param {?String} tag Release tag name if available.
   * @return {Promise} Promise resolved to a file descriptor of newly created
   * file.
   */
  _writeDownloadedSources(buffer, tag) {
    this.logger.debug('Writing source data to temporaty file...');
    let p;
    if (tag) {
      p = this._cache.write(buffer, tag);
    } else {
      p = Promise.resolve();
    }
    return p.then(() => this._processSourcesBuffer(buffer));
  }
  /**
   * Writes downloaded data to a temportaty file.
   *
   * @param {buffer} buffer Downloaded data buffer.
   * @return {Promise} Promise resolved to a file descriptor of newly created
   * file.
   */
  _processSourcesBuffer(buffer) {
    return new Promise((resolve, reject) => {
      tmp.file((err, path, fd) => {
        if (err) {
          reject(new Error('Unable to create a temporary file: ' +
            err.message));
          return;
        }
        this.logger.debug('Writing API console sources to' + path);
        fs.writeFile(path, buffer, (err) => {
          if (err) {
            console.error(err);
            reject(new Error('Unable to write to a temporaty file: ' +
              err.message));
            return;
          }
          this.logger.debug('API console sources saved in temporaty location.');
          resolve(fd);
        });
      });
    });
  }
  /**
   * Moves console's sources to it's `bower_components` directory.
   *
   * @param {String} workingDir Directory where the console sources are placed.
   * @return {Promise}
   */
  moveConsoleToBower(workingDir) {
    return fs.ensureDir(path.join(workingDir, 'bower_components'))
    .then(() => {
      return fs.copy(workingDir, path.join(workingDir, 'bower_components',
        'api-console'), {
        filter: this._filterCopyFiles.bind(this)
      });
    });
  }
  /**
   * Filter for the copy function.
   * Allows any file that are not in `bower_components` or `node_modules`
   * directory or staring with a dot.
   *
   * @param {String} src
   * @return {Boolean}
   */
  _filterCopyFiles(src) {
    const basename = path.basename(src);
    if (basename[0] === '.') {
      return false;
    }
    return src.indexOf('bower_components') === -1 &&
      src.indexOf('node_modules') === -1;
  }
}

exports.ApiConsoleSources = ApiConsoleSources;
