'use strict';
/**
 * Copyright (C) Mulesoft.
 * Shared under Apache 2.0 license
 *
 * @author Pawel Psztyc <pawel.psztyc@mulesoft.com>
 */
import { SourceOptions } from './SourceOptions.js';
import { Cache } from './Cache.js';
import fs from 'fs-extra';
import path from 'path';
import unzipper from 'unzipper';
import tmp from 'tmp';
import winston from 'winston';
const githubHeaders = {
  'user-agent': 'mulesoft-labs/api-console-sources-resolver'
};
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
/**
 * A class responsible for getting the API Console's correct sources
 * and copy it to desired location.
 */
export class SourcesResolver {
  /**
   * Constructs a builder.
   *
   * @param {SourceOptions} opts Options passed to the module
   * @param {GithubResolver} githubResolver A reference to
   * GithubResolver class instance.
   * @param {Transport} transport A reference to ApiConsoleTransport.
   * It can be any object that has `get` method.
   */
  constructor(opts, githubResolver, transport) {
    if (!(opts instanceof SourceOptions)) {
      opts = new SourceOptions(opts);
    }
    /**
     * @type {ApiConsoleSourceOptions}
     */
    this.opts = opts;
    /**
     * Looger object to be used to pring verbose or error messages.
     */
    this.logger = this._setupLogger(opts.logger);
    if (!this.opts.isValid) {
      this._printValidationErrors();
      this._printValidationWarnings();
      throw new Error('Options did not passes validation.');
    }
    this._printValidationWarnings();
    this.githubResolver = githubResolver;
    this.transport = transport;
    this._cache = new Cache(opts.logger);
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
   * @return {Promise<void>}
   */
  async sourcesTo(destination) {
    // define a flow.
    const { tagName, src } = this.opts;
    this.isGithubRelease = !!tagName || (!tagName && !src);
    this.isDownload = src && src.indexOf('http') === 0;
    if (!tagName && !src) {
      await this._downloadLatest(destination);
    } else if (tagName) {
      await this._downloadTagged(tagName, destination);
    } else if (this.isDownload) {
      await this._downloadAny(src, destination);
    } else {
      await this._copyLocal(src, destination);
    }
  }
  /**
   * Copy locally store API Console sources.
   * The `from` can be either directory to copy contents from or a zip file.
   *
   * @param {String} from Location of the sources.
   * @param {String} to Destination where to copy the files.
   * @return {Promise<void>} Promise resolved when all files were copied.
   */
  async _copyLocal(from, to) {
    this.logger.debug('Copying local API Console files to the working dir.');
    const stats = await fs.stat(from);
    if (stats.isFile()) {
      const fd = await this._openZipFile(from, to);
      await this._processZip(fd, to);
      return;
    }

    const src = path.resolve(process.cwd(), from);
    this.logger.debug('Copying files from ' + src);
    await fs.copy(src + '/', to);
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
  async _downloadLatest(destination) {
    this.logger.debug('Downloading latest release info...');
    const info = await this.githubResolver.getLatestInfo();
    return await this._downloadFromReleaseInfo(info, destination);
  }
  /**
   * Downloads information about tagged release, downloads content of the
   * release, unzips the file and copies content to the destination.
   *
   * @param {String} tag Release tag name.
   * @param {String} destination A place where to place unzipped files.
   * @return {Promise<void>} Promise resolved when all files were copied to the
   * `destination`.
   * The promise will reject when:
   *
   * - GitHub rate limit has been exceeded
   * - Release number is lower than 4.0.0
   * - The tag doesn't exists
   * - Couldn't download either release information or the zip file
   * - Couldn't process downloaded sources.
   */
  async _downloadTagged(tag, destination) {
    this.logger.debug('Getting ' + tag + ' release info...');
    const info = await this.githubResolver.getTagInfo(tag);
    return await this._downloadFromReleaseInfo(info, destination);
  }
  /**
   * Getys console sources from release info (GitHub data model)
   *
   * @param {Object} release GitHub release data model
   * @param {String} destination Unzip destination
   * @return {Promise<void>}
   */
  async _downloadFromReleaseInfo(release, destination) {
    const tagName = release.tag_name;
    const location = await this._cache.cachedPath(tagName);
    if (location) {
      this.logger.debug('Reusing cached console sources...');
      const fd = await fs.open(location, 'r');
      await this._processZip(fd, destination);
      return;
    }
    const zipUrl = release.zipball_url;
    this.logger.debug('Downloading release tagged as: ' + tagName);
    await this._downloadAndProcess(zipUrl, destination, tagName);
  }
  /**
   * Downloads api console from any source.
   *
   * @param {String} from The URL of the API console source zip file.
   * @param {String} destination A place where to place unzipped files.
   * @return {Promise<void>} Promise resolved when all files were copied to the
   * `destination`.
   * The promise will reject when:
   *
   * - Couldn't download the zip file
   * - Couldn't process downloaded sources.
   */
  async _downloadAny(from, destination) {
    this.logger.debug('Downloading API Console sources from ' + from);
    await this._downloadAndProcess(from, destination);
  }
  /**
   * Downloads an proceses the API Console sources zip file from a remote
   * location.
   *
   * @param {String} url An URL from where to download file. It must be secure
   * location.
   * @param {String} destination A place where to place unzipped files.
   * @param {?String} tag Tag name
   * @return {Promise<void>} Promise resolved when all files were copied to the
   * `destination`.
   */
  async _downloadAndProcess(url, destination, tag) {
    const buffer = await this.transport.get(url, githubHeaders);
    const fd = await this._writeDownloadedSources(buffer, tag);
    await this._processZip(fd, destination);
  }
  /**
   * Opens the zip file to read.
   * @param {String} source A path to a file.
   * @return {Promise<Object>} Resolved to a file descriptor.
   */
  async _openZipFile(source) {
    this.logger.debug('Opening local zip file of the console.');
    return await fs.open(source, 'r');
  }
  /**
   * Unzips files from the zip file and copy them to the destination folder.
   *
   * @param {Number} fd File descriptor of opened zip file.
   * @param {String} destination Folder where to put the files.
   * @return {Promise<void>}
   */
  _processZip(fd, destination) {
    return new Promise((resolve, reject) => {
      fs.createReadStream(undefined, {
        fd: fd
      })
      .pipe(unzipper.Extract({ path: destination }))
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
   * @return {Promise<void>}
   */
  async _removeZipMainFolder(destination) {
    const files = await fs.readdir(destination);
    if (files.length > 1) {
      return;
    }
    const dirPath = path.join(destination, files[0]);
    const stats = await fs.stat(dirPath);
    if (stats.isDirectory()) {
      await fs.copy(dirPath, destination);
    }
  }

  /**
   * Caches sources (if possible) and writes downloaded data to a
   * temportaty file.
   *
   * @param {buffer} buffer Downloaded data buffer.
   * @param {?String} tag Release tag name if available.
   * @return {Promise<Object>} Promise resolved to a file descriptor of newly created
   * file.
   */
  async _writeDownloadedSources(buffer, tag) {
    this.logger.debug('Writing source data to temporaty file...');
    if (tag) {
      await this._cache.write(buffer, tag);
    }
    return await this._processSourcesBuffer(buffer);
  }
  /**
   * Writes downloaded data to a temportaty file.
   *
   * @param {buffer} buffer Downloaded data buffer.
   * @return {Promise<Object>} Promise resolved to a file descriptor of newly created
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
}
