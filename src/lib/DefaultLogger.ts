import { type LogProvider } from '@ayapapa-npm/file-lock-js';

/**
 * Default logger configration/
 */
export interface DefaultLoggerConfig {
  debug?: boolean,
  stackOnTrace?: boolean,
}

/**
 * Default logger.
 */
export const DefaultLogger = {
  /**
   * trace. 
   * Use `console.debug` to output information only when in debug mode.
   * @param args 
   */
  trace: (...args: unknown[]) => {
    if (DefaultLogger._debug) {
      if (DefaultLogger._stackOnTrace) {
        const obj = { stack: `Call stack: couldn't get` };
        Error.captureStackTrace(obj, DefaultLogger.trace);
        const lines = obj.stack.split(/\r?\n/);
        const index = lines.findIndex(line => line.includes('Error'));
        (index !== -1) && lines.splice(index, 1);
        const result = lines.join("\n");
        args.push('\n' + result);
      }
      console.error('Trace:', ...args)
    }
  },
  /**
   * debug. 
   * Use `console.debug` to output information only when in debug mode.
   * @param args 
   */
  debug: (...args: unknown[]) => {
    if (DefaultLogger._debug) console.debug(...args);
  },
  /**
   * log. 
   * Use `console.log` to output information.
   * @param args 
   */
  log: (...args: unknown[]) => { console.log(...args) },
  /**
   * info. 
   * Use `console.info` to output information.
   * @param args 
   */
  info: (...args: unknown[]) => { console.info(...args) },
  /**
   * warn. 
   * Use `console.warn` to output information.
   * @param args 
   */
  warn: (...args: unknown[]) => { console.warn(...args) },
  /**
   * error. 
   * Use `console.error` to output information.
   * @param args 
   */
  error: (...args: unknown[]) => { console.error(...args) },
  /**
   * error. 
   * Use `console.error` to output information.
   * @param args 
   */
  fatal: (...args: unknown[]) => { console.error(...args) },
  /**
   * Get configuration.
   */
  getConfig(): DefaultLoggerConfig {
    return { 
      debug: DefaultLogger._debug,
      stackOnTrace: DefaultLogger._stackOnTrace
    };
  },
  /**
   * Set configuration.
   * @param config 
   * - debug: boolean If 'true', debug mode is enabled; if 'false', the opposite applies.
   */
  setConfig(config: DefaultLoggerConfig) {
    DefaultLogger._debug = config.debug ?? DefaultLogger._debug;
    DefaultLogger._stackOnTrace = config.stackOnTrace ?? DefaultLogger._stackOnTrace;
  },
  /**
   * @internal
   */
  _debug: false,
  /**
   * @internal
   */
  _stackOnTrace: false,
} as Required<LogProvider> & {
  getConfig: () => DefaultLoggerConfig,
  setConfig: (config: DefaultLoggerConfig) => void, 
  _debug: boolean,
  _stackOnTrace: boolean,
};/**/
