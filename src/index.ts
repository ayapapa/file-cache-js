import { FileCache, FileCacheError, InvalidCache, type Config, type ErrorCode } from './lib/FileCache.ts';
import { DefaultLogger, type DefaultLoggerConfig } from './lib/DefaultLogger.ts'
import { type LogProvider } from '@ayapapa-npm/file-lock-js';
export { DefaultLogger, FileCache, FileCacheError, InvalidCache, type Config, type DefaultLoggerConfig, type ErrorCode, type LogProvider };
export default FileCache;
