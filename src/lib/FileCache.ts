import fs from 'node:fs';
import path from 'node:path';
import { createContracts } from "@ayapapa-npm/contracts-js";
import { FileLock } from "@ayapapa-npm/file-locking-js";
const  { REQUIRE } = createContracts();

/** 
 * @internal
 * Asynchronous sleep. 
 */
export async function sleepAsync(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Configurations.
 */
export interface Config {
  /**
   * Cache validity period (milliseconds)
   * If a value of `0` or less is specified, there is no expiration date.
   * The default is `600000`', which means 10 minutes.
   * Min is `0`.
   */
  ttlMs?: number,

  /**
  * Number of retries in the event of an I/O error. 
  * Default is `1`. 
  * Min is `0`. If a negative value is specified, it will be adjusted to the minimum.   
  */
  retriesOnIoErr?: number;

  /**
   * Retry interval for IO errors (in milliseconds)
   * Default is `100`. 
   * Min is `100`. Values ​​below the minimum will be adjusted to the minimum.
   */
  retryIoIntervalMs?: number,

  /**
   * Cache directory. 
   * Default is "`process.cwd()`/.cache".   
   */
  cacheDir?: string;

  /**
   * Specifies whether to apply exclusive control to cache file I/O operations 
   * during `get`, `set`, or `remove` actions. This helps avoid conflicts with other processes.
  */
  withLock?: boolean;

  /**
   * Maximum wait time to acquire the lock [milliseconds]. <br>
   * `0` does not wait for the preceding unlock. 
   * The minimum value is `0`; if a value lower than this is specified, this minimum value is used.
   * Default is `1000`.
   */
  lockTimeoutMs?: number;

  /**
   * Lock validity period (time to live): the maximum time [milliseconds] from lock acquisition 
   * until the cache operation completes execution. An error (TTLExceeded) occurs if this 
   * period is exceeded. 
   * If it's thrown, set this longer.
   * The minimum value is `1000`; if a value lower than this is specified, this minimum value is used.
   * Default is `1000`.
   */
  lockTtlMs?: number;

  /**
   * The probability (rate) at which old cache entries are removed. 
   * For example, if `0.2` is specified, one removal operation will occur for every five operations (`put`, `get`, or `remove`). 
   * Default is `0.1`. The minimum is `0`, and the maximum is `1.0`. Values ​​outside this range will be adjusted to the minimum or maximum.
   */
  purgeProbability?: number;

  /**
   * Specifies whether to remove invalid cache files.
   * See also `invalidTtlMs`.
   */
  removeInvalid?: boolean,

  /**
   * Validity period in milliseconds for the modification time of invalid `cache file`. <br>
   * If `removeInvalid` is true and the specified amount of time has elapsed since the modification time of an invalid `cache file`, it is forcibly deleted. 
   * Minimum is `0` if a value lower than this is specified, this minimum value is used. 
   * Default is `10000`.
   */
  invalidTtlMs?: number,
};

/**
 * @internal
 * 
 */
type Data = {
  value: unknown,
  expiresAt: number,
}

/**
 * A cache service class that uses files. 
 *
 * Associates a given value with a specified `cache key` and stores it in a `cache file` in JSON format. 
 * The value must be of a type that can be converted to JSON. 
 * Types such as `Map`, `Set`, `Symbol`, `BigInt`, or `Function` cannot be converted 
 * correctly—they may be ignored, converted to `null` or an empty object, or result in an error.
 * The `cache file` is stored within a `cache directory` and named "`cache key`.json". 
 * If the specified `cache key` contains characters that are invalid for a file path,
 * it is converted into a valid file path by replacing those characters with underscores
 * and removing double quotation marks.
 */
export class FileCache {
  /**
   * Static fields
   */

  /**
   * @internal
   * Default configurations.
   */
  static #defaultConfig: Readonly<Required<Config>> = {
    ttlMs:              10 * 60 * 1000,
    retriesOnIoErr:     1,
    retryIoIntervalMs:  100,
    cacheDir:           path.join(process.cwd(), '.cache'),
    withLock:           true,
    lockTimeoutMs:      1000,
    lockTtlMs:          1000,
    purgeProbability:   0.1,
    removeInvalid:      false,
    invalidTtlMs:       10000,
  }

  /**
   * Static methods.
   */
  public static getDefaultConf() {
    return { ...FileCache.#defaultConfig };
  }
  
  /**
   * Instance fields.
   */

  /**
   * @internal
   * Current configurations.
   */
  #currentConfig: Required<Config> = { ...FileCache.#defaultConfig };

  /**
   * @internal
   * A flag indicating that a purge is in progress.
   */
  #purging = false;

  /**
   *  Instance mehods. 
   */

  /**
   * Constructor.
   * @param config  Configurations.
   * Any value other than those explicitly specified will default to the default setting. 
   * If a null-like value (null or undefined) is provided, it is treated as if the value had been omitted.
   */
  public constructor(config: Config = FileCache.#defaultConfig) {
    if (config === FileCache.#defaultConfig) {
      this.#currentConfig = { ...FileCache.#defaultConfig };
    }
    else {
      const rConf = this.#resolvConf(config);
      this.#currentConfig = { ...FileCache.#defaultConfig, ...rConf};
      this.#currentConfig.ttlMs = Math.max(this.#currentConfig.ttlMs, 0);
      this.#currentConfig.retriesOnIoErr = Math.max(this.#currentConfig.retriesOnIoErr, 0);
      this.#currentConfig.retryIoIntervalMs = Math.max(this.#currentConfig.retryIoIntervalMs, 100);
      this.#currentConfig.lockTimeoutMs = Math.max(this.#currentConfig.lockTimeoutMs, 0);
      this.#currentConfig.lockTtlMs = Math.max(this.#currentConfig.lockTtlMs, 1000);
      this.#currentConfig.purgeProbability = Math.min(Math.max(this.#currentConfig.purgeProbability, 0), 1.0);
      this.#currentConfig.cacheDir = this.#getCacheDir();
      this.#currentConfig.invalidTtlMs = Math.max(this.#currentConfig.invalidTtlMs, 0);
    }
  }

  /**
   * Get the `cache value` corresponding to the `cache key`.
   * @param key `cache key`
   * If the specified `cache key` contains characters that are invalid for a file path, 
   * it is converted into a valid file path by replacing those characters with underscores 
   * and removing double quotation marks.
   * @returns A promise that resolves to the `cache value' provided during 
   * the `put` operation (or `undefined` if no `cache key' exists for the given 'cache key').
   * @throws  
   * - `InvalidCache` If contents is not valid Json or, has not mandatory propaties. 
   * - `FileCacheError` If invalid `cache key', file IO error, or lock error.
   */
  public async get(key: string) {
    REQUIRE(typeof key === 'string' && key.length > 0, "Invalid key.", FileCacheError, null, { code: 'EINVAL' });
    return this.#execute(key, async () => {
        return (await this.#get(key)).value;
    });
  }
  
  /**
   * Get all `cache key`s and their corresponding `cache value`s. 
   * Expired cache entries are listed with a value of `undefined`.
   * @param options Options. <br>
   * - throwIfInvalid: `boolean` — If `true`, an error is thrown when an invalid cache file is encountered. 
   * Note that the determination of whether a `cache file` is invalid depends on the `removeInvalid` and 
   * `invalidTtlMs` settings defined in the `Config` object at the time of construction. (See also `Config`.)
   * @returns A promise that resolves to the retrieved `cache key`s and `cache value`s (in the format { `cache key`: `cache value` }).
   * @throws  
   * - `InvalidCache` If contents is not valid Json or, has not mandatory propaties. 
   * - `FileCacheError` If file IO error, or lock error.
   */
  public async getAll(options? : { throwIfInvalid?: boolean }): Promise<Record<string, unknown>> {
    const throwIfInvalid = options?.throwIfInvalid ?? false;
    const ret = {} as Record<string, unknown>;
    await this.#forAllKeys(async (key: string) => {
      try {
        const value = await this.get(key);
        /*if (value !== undefined) */ret[key] = value;
      }
      catch (err) {
        if (err instanceof InvalidCache === false || throwIfInvalid == true) {
          throw err;
        }
        else {
          return;
        }
      }
    });
    return ret;
  }

  /**
   * Get the current configurations.
   * @returns Copy of the current configurations.
   */
  public getConfig(): Required<Config> {
    return {...this.#currentConfig };
  }

  /**
   * Perform a mass removal of the cash. 
   * @param options Options.
   * - force: `boolean` — If `true`, deletes all cache files, including those identified as invalid. 
   * Note that the determination of whether a cache file is "invalid" depends on the `removeInvalid` and `invalidTtlMs` settings in the `Config` object provided at instantiation. (See also `Config`.)
   * @returns An object containing the keys that failed to be deleted and the reasons for the failure; returns `undefined` if no deletions failed.
   */
  public async purge(options?: { force?: boolean }) {
    if (this.#purging) return;
    this.#purging = true;
    const failures = {} as Record<string, unknown>;
    const exec = async (funcName: 'get' | 'remove') => {
      return await this.#forAllKeys(async (key: string) => {
        try {
          await this[funcName](key);
        }
        catch (err) {
          failures[key] = err;
        }
      });
    }
    try {
      // Use 'remove' for a forced deletion; otherwise, use 'get'.
      // With 'get', expired files are automatically deleted.
      await exec(options?.force ? 'remove' : 'get');
    }
    finally {
      this.#purging = false;
    }
    return Object.keys(failures).length > 0 ? failures : undefined;
  }

  /**
   * `cache key`に対応する`chache file`を削除する。
   * 不正`chache file`である場合は、`removeInvalid`および`invalidTtlMs`の設定に従い削除され`undefined`が返るか、もしくは、エラー。
   * @param key キー
   * @throws  
   * - `InvalidCache` If contents is not valid Json or, has not mandatory propaties. 
   * - `FileCacheError` If invalid `cache key', file IO error, or lock error.
   */
  public async remove(key: string) {
    REQUIRE(typeof key === 'string' && key.length > 0, "Invalid key.", FileCacheError, { code: 'EINVAL', key });
    return this.#execute(key, async () => {
      // '#get'することで、余分なファイルの削除をさせる。
      // '#get'で有効と判定されたファイルは、'#remove'で削除する。
      // ただし、'value'そのものが`undefined`のケース(res.value === undefined && reason==='ASIS')もある。
      const res = await this.#get(key);
      if (res.value === undefined && res.reason !== 'ASIS') return;
      return this.#remove(key);
    }) as Promise<void>;
  }

  /**
   * Store `cache key' and `cache value` ​​in a `cache file`. 
   * If a `cache file` with the same 'cache key' already exists, it will be overwritten.
   * @param key     `cache key'
   * If the specified `cache key` contains characters that are invalid for a file path, 
   * it is converted into a valid file path by replacing those characters with underscores 
   * and removing double quotation marks.
   * @param value   `cache value'
   * @param options Options.
   * - ttlMs: `number` type. Takes precedence over the configuration passed to the constructor.
   * @throws  `FileCacheError` If invalid `cache key', file IO error, or lock error.
   */
  public async set(key: string, value: unknown, options?: { ttlMs?: number }) {
    REQUIRE(typeof key === 'string' && key.length > 0, "Invalid key.", FileCacheError, { code: 'EINVAL', key });
    return this.#execute(key, async () => {
      const ttlMs = options?.ttlMs ?? this.#currentConfig.ttlMs;
      const expiresAt = ttlMs > 0 ? Date.now() + ttlMs : 0;
      return this.#set(key, { value, expiresAt });
    }) as Promise<void>;
  }

  /**
   * @internal
   * File IO with retry.
   * @param callback  File IO callback.
   * @param msg       Error message.
   * @returns 
   */
  async #access(key: string | null, callback: () => unknown, msg: string) {
    let retries = this.#currentConfig.retriesOnIoErr;
    const interval = this.#currentConfig.retryIoIntervalMs;

    const exec = async () => {
      try {
        return callback();
      }
      catch (err) {
        if (retries-- > 0) {
          await sleepAsync(interval);
          return exec();
        }
        const param = { code: 'EIO', cause: err } as { code: string, cause?: unknown, key?: string};
        err instanceof Error && 'code' in err && (param.code = String(err.code));
        key !== null && key.length > 0 && (param.key = key);
        throw new FileCacheError(msg, param);
      }
    }

    return exec();
  }

  /**
   * @internal
   * Execute cache operation.  
   * @param  key `cache key`
   * @param  operation  Cache operation.
   * @return A promise that resolves to the return value of a cache operation.
   * @throws `FileCacheError` If IO error, or lock error.
   */ 
  async #execute(key: string, operation: () => unknown) {
    await this.#purgeRandom();
    if (this.#currentConfig.withLock) {
      try {
        return await FileLock.withLock(key, operation, { 
          timeoutMs: this.#currentConfig.lockTimeoutMs,
          ttlMs: this.#currentConfig.lockTtlMs,
        });
      }
      catch (err) {
        if (err instanceof FileCacheError) throw err;
        else throw new FileCacheError("Failed to acquire the lock.", { code: "ELOCK", key, cause: err });
      }
    }
    return operation();
  }

  /**
   * Processing for all keys.
   @param action The process to be executed.
   */
  async #forAllKeys(action: (key: string) => Promise<void>) {
    const keys = await this.#getAllKeys();
    for (const key of keys) {
      await action(key);
    }
  }

  /**
   * @internal
   * get cached data from a `cache file`.
   * @param key `cache key`
   * @return The `cache value`, and the reason why it is that particular value.
   */
  async #get(key: string): Promise<{ value: unknown, reason: 'NOTEXIST' | 'EXPIRED' | 'ASIS' }> {
    const filePath = this.#getFilePath(key);
    const contents = await this.#access(key, () => {
      if (!fs.existsSync(filePath)) return undefined;
      return fs.readFileSync(filePath, 'utf8');
    },
    "Failed to read `cache file`."
    ) as string | undefined;
    if (contents === undefined) return { value: undefined, reason: 'NOTEXIST' };

    try {
      const cached = this.#parse(contents, key);
      if (cached.expiresAt === 0 || cached.expiresAt > Date.now()) {
        return { value: cached.value, reason: 'ASIS' }; // 有効値
      }
    }
    catch (err) {
      // Analysis failed (invalid file); checking deletion instructions 
      // to determine whether to proceed with deletion.
      if (this.#currentConfig.removeInvalid === false) {
        throw err;
      }
      // Check and evaluate the file's modification time.
      const stat = await this.#access(
        key, 
        () => fs.statSync(this.#getFilePath(key), { throwIfNoEntry: false }),
        "Failed to get `cache file` information."
      ) as fs.Stats | undefined;
      if (stat === undefined || stat.mtimeMs + this.#currentConfig.invalidTtlMs > Date.now()) {
        throw err;
      }
    }

    // Deleted due to expiration
    await this.#remove(key); 
    return { value: undefined, reason: 'EXPIRED' };
  }

  /**
   * @internal
   * Get all `cache key`s that exist as files.
   * @returns A list of all `cache key`s that exist as files.
   * @throws `FileCacheError` If IO error.
   */
  async #getAllKeys() {
    const dir = this.#currentConfig.cacheDir;
    const list = await this.#access(null, 
      () => fs.readdirSync(dir, { withFileTypes: true }), 
      "Failed to read `cache directory` information."
    ) as fs.Dirent<string>[];
    return list.filter(item => item.isFile()).map(item =>  path.parse(item.name).name);
  }

  /**
   * @internal
   * Get the directory path for storing cache data.
   * @returns `cache directory`.
   * @throws `FileCacheError` If not found or couldn't create the `cache direkutory`.
   */
  #getCacheDir() {
    // Directory search strategy (in order of priority)
    // 1. Specified directory
    // 2. Working directory (`process.cwd()`)/.cache
    const candidates = [
      () => this.#currentConfig.cacheDir,
      () => path.join(process.cwd(), '.cache'),
    ];

    for (const getDir of candidates) {
      let dir = getDir();
      try {
        dir = path.resolve(dir);
        if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) return dir;
        fs.mkdirSync(dir, { recursive: true });
        return dir;
      }
      catch (err) {
        continue;
      }
    }
    throw new FileCacheError("Failed to create the cache data storage directory.", { code: 'ECREATECACHEDIR' });
  }

  /**
   * @internal
   * Get `cache file` path.
   * @param {string}  key
   */
  #getFilePath(key: string) {
    const encodedKey = key.replace(/[<>:/\\|?*]/g, () => '_').replace(/"/g, () => '');
    return path.join(this.#currentConfig.cacheDir, `${encodedKey}.json`)
  }

  /**
   * @internal
   * Analyze the `cache key` content and retrieve the value corresponding to the `cache key`.
   * @param contents 
   * @param key 
   * @returns The `cache value` corresponding to the `cache key`, as well as its expiration time.
   * @throws  `InvalidCache` If contents is not valid Json or, has not mandatory propaties. 
   */
  #parse(contents: string, key: string) {
    let cached!: Data;
    try {
      cached = JSON.parse(contents) as Data;
    }
    catch (err) {
      throw new InvalidCache(null, { key, cause: err });
    }
    if (cached.expiresAt === undefined) {
      throw new InvalidCache(null, { key, cause: 'No `expiresAt`' } );
    }
    return cached;
  }

  /**
   * 一定確率で古いキャッシュの一斉除去を行う 
   */
  async #purgeRandom() {
    if (Math.random() <= this.#currentConfig.purgeProbability) await this.purge();
  }

  /**
   * @internal
   * Remove the `cache file` corresponding to the `cache key`.
   * @param  key `cache key`
   * @throws `FileCacheError` If invalid `cache key', or file IO error.
   */
  async #remove(key: string) {
    const path = this.#getFilePath(key)
    return this.#access(key, () => {
      if (fs.existsSync(path)) {
        fs.unlinkSync(path);
      } 
    },
    "Failed to remove `cache file`."
    ) as Promise<void>;
  }

  /**
   * @internal
   * Resolve the configurations.
   * Type checking, range checking, and the exclusion of null-related values ​​and unknown properties.
   * @param config 
   * @returns Resolved configurations.
   */
  #resolvConf(config: Config) {
    const rConf = {} as Record<string, unknown>;
    const defaultConf = FileCache.#defaultConfig as Readonly<Record<string, unknown>>;

    Object.entries(config).forEach(v => {
      const key = v[0];
      const value = v[1];
      if (value != null && defaultConf[key] != null) {
        // Check type.
        REQUIRE(typeof value === typeof defaultConf[key], `Invalid ${key}.`, FileCacheError, { code: 'EINVAL' });
        let ok = true;
        if (typeof value === "number") {
          // Check range.
          switch (key) {
            case 'ttlMs':            
            case 'retryIoIntervalMs':  
            case 'lockTimeoutMs':      
            case 'lockTtlMs':          
            case 'invalidTtlMs':      ok = Number.isFinite(value); break;
            case 'retriesOnIoErr':    ok = Number.isSafeInteger(value); break;
            case 'purgeProbability':  ok = Number.isFinite(value); break;
          }
          REQUIRE(ok, `Invalid ${key}.`, FileCacheError, { code: 'EOUTRANGE' });
        }
        // Save as resolved setting.
        rConf[key] = value;
      }
    });
    return rConf;
  }

  /**
   * @internal
   * Store cache data in a `cache file`.
   * @param key `cache key`
   * @param data  Cached data (a "cache value" and an expiration time).
   * @throws `FileCacheError` If invalid `cache key', or file IO error.
   */
  async #set(key: string, data: Data): Promise<void> {
    return this.#access(key, () => {
      fs.writeFileSync(this.#getFilePath(key), JSON.stringify(data, null, "  "));
    },
    "Failed to write `cache file`."
    ) as Promise<void>;
  }

}

// キャッシュエラー
export class FileCacheError extends Error {
  /**
   * コンストラクタ。
   * @param msg   Error message.
   * @param param Parameters。
   */
  constructor(msg: string, param?: { code: string, cause?: unknown, key?: string }) { 
    super(msg);
    param?.code != null && (Object.assign(this, { code: param.code }));
    param?.cause != null && (Object.assign(this, { cause: param.cause }));
    param?.key != null && (Object.assign(this, { key: param.key }));
  }
};

export class InvalidCache extends FileCacheError {
  static #defaultMsg: string = "Found an invalid `cache file`.";
  /**
   * コンストラクタ。
   * @param msg   Error message. If null, use a default message("Found an invalid `cache file`.").
   * @param param Parameters。
   */
  constructor(msg: string | null = InvalidCache.#defaultMsg, param?: { cause?: unknown, key?: string } ) { 
    msg = msg || InvalidCache.#defaultMsg;
    const rParam = { code: 'EINVALIDCACHE' } as { code: string, cause?: unknown, key?: string };
    param?.cause && (rParam.cause = param?.cause);
    param?.key && (rParam.key = param?.key);
    super(msg, rParam);
  }
}
