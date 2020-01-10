// tslint:disable:variable-name Describing an API that's defined elsewhere.
// tslint:disable:no-any describes the API as best we are able today

export {SourceOptions};

interface Options {
  tagName?: string;
  src?: string;
  ignoreCache?: boolean;
  logger?: Object;
  verbose?: boolean;
}

/**
 * Options object for the GithubResolver class.
 */
declare class SourceOptions {
  tagName?: string;
  src?: string;
  ignoreCache?: boolean;
  logger?: Object;
  verbose?: boolean;
  readonly validOptions: Array<String>;
  readonly isValid: boolean;

  constructor(opts?: Options);
  validateOptions(userOpts?: Options): void;
  _setDefaults(opts: Options): Options;
  _validateOptionsList(userOpts: Options): void;
  _validateSourceOptions(userOpts: Options): void;
}
