// tslint:disable:variable-name Describing an API that's defined elsewhere.
// tslint:disable:no-any describes the API as best we are able today

export {SourcesResolver};

/**
 * Options object for the GithubResolver class.
 */
declare class SourcesResolver {
  opts: Object;
  logger: Object;
  githubResolver: Object;
  transport: Object;
  _cache: Object;
  constructor(opts: Object, githubResolver: Object, transport: Object);
  _setupLogger(): Object;
  _printValidationErrors(): void;
  _printValidationWarnings(): void;
  sourcesTo(destination: string): Promise<void>;
  _copyLocal(from: string, to: string): Promise<void>;
  _downloadLatest(destination: string): Promise<void>;
  _downloadTagged(tag: string, destination: string): Promise<void>;
  _downloadFromReleaseInfo(release: Object, destination: string): Promise<void>;
  _downloadAny(from: string, destination: string): Promise<void>;
  _downloadAndProcess(url: string, destination: string, tag: string): Promise<void>;
  _openZipFile(source: string): Promise<Object>;
  _processZip(fd: Object): Promise<void>;
  _removeZipMainFolder(destination: string): Promise<void>;
  _writeDownloadedSources(buffer: Buffer, tag: string): Promise<Object>;
  _processSourcesBuffer(buffer: Buffer): Promise<Object>;
}
