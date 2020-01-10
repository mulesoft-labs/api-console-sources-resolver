// tslint:disable:variable-name Describing an API that's defined elsewhere.
// tslint:disable:no-any describes the API as best we are able today

export {Cache};

/**
 * A class responsible for caching logic for the API console.
 *
 * The class stores data in user's home data folder in
 * `api-console/cache/sources/[tag-name].zip` folder.
 *
 * Note, this only caches offiocial GitHub releases.
 */
declare class Cache {
  constructor(logger: Object);
  locateAppDir(): String;
  _tagToName(tag: string): string;
  cachedPath(tag: string): Promise<string>;
  write(buffer: Buffer, tag: string): Promise<void>;
}
