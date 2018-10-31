const path = require('path');
const fs = require('fs-extra');
/**
 * A class responsible for caching logic for the API console.
 *
 * The class stores data in user's home data folder in
 * `api-console/cache/sources/[tag-name].zip` folder.
 *
 * Note, this only caches offiocial GitHub releases.
 */
class ApiConsoleCache {
  /**
   * @constructor
   * @param {Object} logger
   */
  constructor(logger) {
    this.logger = logger;
    this.cacheFolder = this.locateAppDir();
  }
  /**
   * Creates a path to cache folder under user data folder.
   *
   * @return {String}
   */
  locateAppDir() {
    let dir;
    if (process.env.APPDATA) {
      dir = process.env.APPDATA;
    } else if (process.platform === 'darwin') {
      dir = path.join(process.env.HOME, 'Library', 'Preferences');
    } else if (process.platform === 'linux') {
      dir = path.join(process.env.HOME, '.config');
    } else {
      dir = '/var/local';
    }
    dir = path.join(dir, 'api-console', 'cache', 'sources');
    this.logger.debug('Setting sources cache path to ' + dir);
    return dir;
  }
  /**
   * Normalizes tag name.
   * @param {String} tag
   * @return {String}
   */
  _tagToName(tag) {
    if (tag[0] === 'v') {
      tag = tag.substr(1);
    }
    return tag;
  }
  /**
   * Checks if cached version of the console exists in local file system.
   * @param {String} tag Console tag name
   * @return {Promise<String>} Promise resolved to cached file location.
   */
  cachedPath(tag) {
    tag = this._tagToName(tag);
    const location = path.join(this.cacheFolder, `${tag}.zip`);
    this.logger.debug('Checking for cached console in ' + location);
    return fs.pathExists(location)
    .then((exists) => {
      if (exists) {
        this.logger.debug('Cached version exists.');
        return location;
      }
      this.logger.debug('Cached version does not exist.');
    });
  }
  /**
   * Writes buffer data to a cache location.
   * @param {Buffer} buffer Downloaded file
   * @param {String} tag Tag name
   * @return {Promise}
   */
  write(buffer, tag) {
    tag = this._tagToName(tag);
    const location = path.join(this.cacheFolder, `${tag}.zip`);
    this.logger.debug('Caching console to ' + location);
    return fs.ensureDir(this.cacheFolder)
    .then(() => fs.writeFile(location, buffer));
  }
}
exports.ApiConsoleCache = ApiConsoleCache;
