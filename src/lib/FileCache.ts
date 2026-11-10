import fs from 'node:fs';
import path from 'node:path';
import { createContracts } from "@ayapapa-npm/contracts-js";
import { FileLock, /*type FileLockConfig,*/ type FileLockOptions } from "@ayapapa-npm/file-lock-js";
const  { REQUIRE } = createContracts();


let seq = 0;

function trace(event: string, id: number): void {
  if (id != 9999999)
     console.log(
    `${String(++seq).padStart(4, '0')} ${performance.now().toFixed(3)} ${event} ${id}`
  );
}

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
   * Cache directory. 
   * Default is "`process.cwd()`/.cache".   
   */
  cacheDirectory?: string;

  /**
   * Cache validity period (milliseconds)
   * If a value of `0` or less is specified, there is no expiration.
   * The default is `600000`', which means 10 minutes.
   */
  ttlMs?: number,

  /**
   * Specifies whether to apply exclusive control to cache file I/O operations 
   * during `get`, `set`, or `remove` actions. This helps avoid conflicts with other processes.
   * Default is `true`. If set to `false`, exclusive control is not applied, which may lead to conflicts with other processes.
  */
  withLock?: boolean;

  /**
   * Specifies the directory path to stored locking imformations.
   * If it has been specified, use this as the top priority.
   * The directory is determined based on the following order of priority:<br>
   *  1. Specified via an `Config` (user's explicit intent)
   *  2. "`process.cwd()`/.lock" (".lock" under `current working directory at runtime`)
   * Note: In cases where the directory is explicitly specified (1 or 2 above), an error occurs if the specified directory does not exist and its creation fails.
   */
  lockDirectory?: string;

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
   * For example, if `0.2` is specified, one removal operation will occur for every five operations (`set`, `get`, or `remove`). 
   * Default is `0.1`. The minimum is `0`, and the maximum is `1.0`. Values ​​outside this range will be adjusted to the minimum or maximum.
   */
  purgeProbability?: number;

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
   * Specifies whether to remove invalid cache files.
   * See also `invalidTtlMs`.
   */
  removeInvalid?: boolean,

  /**
   * Validity period in milliseconds for the modification time of invalid `cache file`. <br>
   * If `removeInvalid` is true and the specified amount of time has elapsed since the modification time of an invalid `cache file`, it is forcibly removed. 
   * Minimum is `0` if a value lower than this is specified, this minimum value is used. 
   * Default is `600000`.
   */
  invalidTtlMs?: number,

  /**
   * @internal
   */
  _debug?: boolean;
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
 * If you wish to cache these values, please convert them into a format 
 * that can be serialized to JSON before and after the caching process.
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
    cacheDirectory:     path.join(process.cwd(), '.cache'),
    withLock:           true,
    lockDirectory:      path.join(process.cwd(), '.lock'),
    lockTimeoutMs:      1000,
    lockTtlMs:          1000,
    purgeProbability:   0.1,
    removeInvalid:      false,
    invalidTtlMs:       600000,
    _debug:             false,
  }

  /**
   * Static methods.
   */
  public static getDefaultConf(): Config {
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
   * Keys for key management.
   */
  readonly #keyForKeyManagement = 'FileCache_KeyMgrKey';

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
    const rConf = this.#resolvConf(config);
    this.#currentConfig = { ...FileCache.#defaultConfig, ...rConf};
    this.#currentConfig.ttlMs = Math.max(this.#currentConfig.ttlMs, 0);
    this.#currentConfig.retriesOnIoErr = Math.max(this.#currentConfig.retriesOnIoErr, 0);
    this.#currentConfig.retryIoIntervalMs = Math.max(this.#currentConfig.retryIoIntervalMs, 100);
    this.#currentConfig.lockTimeoutMs = Math.max(this.#currentConfig.lockTimeoutMs, 0);
    this.#currentConfig.lockTtlMs = Math.max(this.#currentConfig.lockTtlMs, 1000);
    this.#currentConfig.purgeProbability = Math.min(Math.max(this.#currentConfig.purgeProbability, 0), 1.0);
    this.#currentConfig.cacheDirectory = this.#getCacheDir();
    this.#currentConfig.invalidTtlMs = Math.max(this.#currentConfig.invalidTtlMs, 0);
    if (this.#currentConfig.withLock) {
      FileLock.setConfig({ lockDirectory: this.#currentConfig.lockDirectory });
    }
  }

  /**
   * Get the `cache value` corresponding to the `cache key`.
   * @param key `cache key`
   * If the specified `cache key` contains characters that are invalid for a file path, 
   * it is converted into a valid file path by replacing those characters with underscores 
   * and removing double quotation marks.
   * @returns A promise that resolves to the `cache value' provided during 
   * the `set` operation (or `undefined` if no `cache key' exists for the given 'cache key').
   * @throws  {@link InvalidCache}    If cache contents is not valid Json or, has not mandatory propaties. 
   * @throws  {@link FileCacheError}  If invalid `cache key', file IO error, or lock error.
   */
  public async get<T = unknown>(key: string): Promise<T | undefined> {
    REQUIRE(typeof key === 'string' && key.length > 0, "Invalid `cache key`.", FileCacheError, null, { code: 'EINVAL' });
    return this.#execute(key, async () => {
        return (await this.#get<T>(key)).value;
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
   * @throws  {@link InvalidCache}    If cache contents is not valid Json or, has not mandatory propaties. 
   * @throws  {@link FileCacheError}  If file IO error, or lock error.
   */
  public async getAll(options? : { throwIfInvalid?: boolean }): Promise<Record<string, unknown>> {
    const throwIfInvalid = options?.throwIfInvalid ?? false;
    const ret = {} as Record<string, unknown>;
    return this.#execute(this.#keyForKeyManagement, async () => {
      await this.#forAllKeys(async (key: string) => {
        try {
          const v = await this.get(key);
          if (v === undefined) {
            await this.#removeKey(key);
          }
          else {
            ret[key] = v;
          }
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
    }, { // Specify a relatively large timeout and TTL, as the operation applies to the entire key.
      lockTimeoutMs: this.#currentConfig.lockTimeoutMs * 10,
      lockTtlMs: this.#currentConfig.lockTtlMs * 10,
    });
  }

  /**
   * Get the current configurations.
   * @returns Copy of the current configurations.
   */
  public getConfig(): Required<Config> {
    return {...this.#currentConfig };
  }

  public has(key: string) {
    const path = this.#getFilePath(key);
    return fs.existsSync(path);
  }

  /**
   * Perform a mass removal of the cash. 
   * @param options Options.
   * - force: `boolean` — If `true`, deletes all cache files, including those identified as invalid. 
   * Note that the determination of whether a cache file is "invalid" depends on the `removeInvalid` and `invalidTtlMs` settings in the `Config` object provided at instantiation. (See also `Config`.)
   * @returns An object containing the keys that failed to be deleted and the reasons for the failure; returns `undefined` if no deletions failed.
   * @throws  {@link InvalidCache}    If cache contents is not valid Json or, has not mandatory propaties. 
   * @throws  {@link FileCacheError}  If invalid `cache key', file IO error, or lock error.
   */
  public async purge(options?: { force?: boolean }): Promise<Record<string, unknown> | undefined> {
    if (this.#purging) return;
    this.#purging = true;
    const failures = {} as Record<string, unknown>;
    const exec = async (funcName: 'get' | 'remove'): Promise<void> => {
      return this.#execute(this.#keyForKeyManagement, async () => {
        return await this.#forAllKeys(async (key: string) => {
          try {
            if (this.has(key)) {
              await this[funcName](key);
            }
            else {
              await this.#removeKey(key);
            }
          }
          catch (err) {
            failures[key] = err;
            await this.#removeKey(key);
          }
        });
      }, { // Specify a relatively large timeout and TTL, as the operation applies to the entire key.
        lockTimeoutMs: this.#currentConfig.lockTimeoutMs * 10,
        lockTtlMs: this.#currentConfig.lockTtlMs * 10,
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
   * Remove the `cache file` corresponding to a given `cache key`. 
   * If the `cache file` is considered invalid, it is deleted according to the `removeInvalid` 
   * and `invalidTtlMs` settings, resulting in either a return value of `undefined` or an error.
   * @param key `cache key`
   * @throws  {@link InvalidCache}    If cache contents is not valid Json or, has not mandatory propaties. 
   * @throws  {@link FileCacheError}  If invalid `cache key', file IO error, or lock error.
   */
  public async remove(key: string): Promise<void> {
    REQUIRE(typeof key === 'string' && key.length > 0, "Invalid `cache key`.", FileCacheError, { code: 'EINVAL', key });
    return this.#execute(key, async () => {
      // Use '#get' to identify files for deletion. 
      // Files determined to be eligible via '#get' are then deleted using '#remove'. 
      // Note, however, that there are cases where 'value' itself is `undefined` (i.e., `res.value === undefined && reason === 'ASIS'`).
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
   * The value must be of a type that can be converted to JSON. 
   * Types such as `Map`, `Set`, `Symbol`, `BigInt`, or `Function` cannot be converted 
   * correctly—they may be ignored, converted to `null` or an empty object, or result in an error.
   * If you wish to cache these values, please convert them into a format 
   * that can be serialized to JSON before the caching process.
   * @param options Options.
   * - ttlMs: `number` type. Takes precedence over the configuration passed to the constructor. 
   * If a value of `0` or less is specified, there is no expiration.
   * @throws  {@link FileCacheError}  If invalid `cache key', file IO error, or lock error.
   */
  public async set<T>(key: string, value: T, options?: { ttlMs?: number }): Promise<void> {
{
const id = value as number;
trace('set:start', id);
//await sleepAsync(0);

    REQUIRE(typeof key === 'string' && key.length > 0, "Invalid `cache key`.", FileCacheError, { code: 'EINVAL', key });
try {  
    return await this.#execute(key, async () => {
      const ttlMs = options?.ttlMs ?? this.#currentConfig.ttlMs;
      const expiresAt = ttlMs > 0 ? Date.now() + ttlMs : 0;
      return await this.#set(key, { value, expiresAt });
    },
{
  id,
}
    );// as Promise<void>;
}
finally {
trace('set:complete', id);
}
}  }

  /**
   * @internal
   * File IO with retry.
   * @param callback  File IO callback.
   * @param msg       Error message.
   * @returns 
   */
  async #access<T>(key: string | null, callback: () => T, msg: string): Promise<T> {
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


  async #getKeyMgr(): Promise<Set<string>> {
    const v = (await this.#get<string[]>(this.#keyForKeyManagement)).value;
    return new Set((v ?? []));
  }

  async #setKeyMgr(km: Set<string>): Promise<void> {
    return this.#set(this.#keyForKeyManagement, { value: [...km], expiresAt: 0 });
  }

  /**
   * @internal
   * Keyマネージャにkeyを追加する
   * @param key 
   */
  async #addKey(key: string): Promise<void> {
    return this.#execute(this.#keyForKeyManagement, async () => {
      const keyMgr = await this.#getKeyMgr();
      keyMgr.add(key);
      return this.#setKeyMgr(keyMgr);
    }, {
      allowReentry: true
    });
  }

  /**
   * @internal
   * Keyマネージャからkeyを削除する
   * @param key 
   */
  async #removeKey(key: string): Promise<void> {
    return this.#execute(this.#keyForKeyManagement, async () => {
      const keyMgr = await this.#getKeyMgr();
      keyMgr.delete(key);
      return this.#setKeyMgr(keyMgr);
    }, {
      allowReentry: true
    });
  }

  
  /**
   * @internal
   * Execute cache operation.  
   * @param  key `cache key`
   * @param  operation  Cache operation.
   * @return A promise that resolves to the return value of a cache operation.
   * @throws  {@link FileCacheError}  If invalid `cache key', file IO error, or lock error.
   */ 
  async #execute<T>(key: string, operation: () => PromiseLike<T>, options?: {
    allowReentry?: boolean,
    lockTimeoutMs?: number,
    lockTtlMs?: number,
    id?: number
   }): Promise<T> {
const id =  options?.id ?? 9999999;
if (!options?.allowReentry) trace('lock:try', id);
    await this.#purgeRandom();
    if (this.#currentConfig.withLock) {
      //const start = Date.now();
      const lockOpts = { 
          timeoutMs: options?.lockTimeoutMs ?? this.#currentConfig.lockTimeoutMs,
          ttlMs: options?.lockTtlMs ?? this.#currentConfig.lockTtlMs,
          allowReentry: Boolean(options?.allowReentry)
        } as FileLockOptions;
        //FileLock.setConfig({ _debug: true } as FileLockConfig)
      try {
        return await FileLock.withLock(key, () => {
trace('lock:acquired', id);
          //console.log(Date.now() - start);
try {
          return operation();
}
finally {
  trace('lock:release', id);
}            
        }, lockOpts);
      }
      catch (err) {
        console.error(err);
        if (err instanceof FileCacheError) throw err;
        else throw new FileCacheError("Failed to acquire the lock.", { code: "ELOCK", key, cause: err });
      }
      finally { //
      }
    }
    return operation();
  }

  /**
   * Processing for all keys.
   @param action The process to be executed.
   */
  async #forAllKeys(action: (key: string) => Promise<void>): Promise<void> {
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
  async #get<T = unknown>(key: string): Promise<{ value: T | undefined, reason: 'NOTEXIST' | 'EXPIRED' | 'ASIS' }> {
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
        return { value: cached.value as T, reason: 'ASIS' }; // 有効値
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
        () => fs.statSync(filePath, { throwIfNoEntry: false }),
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
   * @throws  {@link FileCacheError}  If file IO error.
   */
  async #getAllKeys(): Promise<string[]> {
    return [...(await this.#getKeyMgr())];
    /*
    const dir = this.#currentConfig.cacheDirectory;
    const list = await this.#access(null, 
      () => fs.readdirSync(dir, { withFileTypes: true }), 
      "Failed to read `cache directory` information."
    ) as fs.Dirent<string>[];
    return list.filter(item => item.isFile()).map(item =>  path.parse(item.name).name);
    */
  }

  /**
   * @internal
   * Get the directory path for storing cache data.
   * @returns `cache directory`.
   * @throws {@link FileCacheError} If not found or couldn't create the `cache direkutory`.
   */
  #getCacheDir(): string {
    // Directory search strategy (in order of priority)
    // 1. Specified directory
    // 2. Working directory (`process.cwd()`)/.cache
    const candidates = [
      [this.#currentConfig.cacheDirectory, true],
      [path.join(process.cwd(), '.cache'), false]
    ] as const;

    for (const [dir, required] of candidates) {
      try {
        if (dir === undefined || dir === null || dir.length === 0) continue;
        const rDir = path.resolve(dir);
        if (fs.existsSync(rDir) && fs.statSync(rDir).isDirectory()) return rDir;
        fs.mkdirSync(rDir, { recursive: true });
        return rDir;
      }
      catch (err) {
        if (required) {
          throw new FileCacheError("Failed to create the cache data storage directory.", { code: 'ECREATECACHEDIR', cause: err });
        }
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
  #getFilePath(key: string): string {
    const encodedKey = key.replace(/[<>:/\\|?*]/g, () => '_').replace(/"/g, () => '');
    return path.join(this.#currentConfig.cacheDirectory, `${encodedKey}.json`)
  }

  /**
   * @internal
   * Analyze the `cache key` content and retrieve the value corresponding to the `cache key`.
   * @param contents 
   * @param key 
   * @returns The `cache value` corresponding to the `cache key`, as well as its expiration time.
   * @throws  {@link InvalidCache}    If cache contents is not valid Json or, has not mandatory propaties. 
   */
  #parse(contents: string, key: string): Data {
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
  async #purgeRandom(): Promise<void> {
    if (Math.random() <= this.#currentConfig.purgeProbability) {
      await this.purge();
    }
  }

  /**
   * @internal
   * Remove the `cache file` corresponding to the `cache key`.
   * @param  key `cache key`
   * @throws  {@link FileCacheError}  If invalid `cache key', or file IO error.
   */
  async #remove(key: string): Promise<void> {
    const path = this.#getFilePath(key)
    await this.#access(key, () => {
      fs.existsSync(path) &&
        fs.unlinkSync(path);
    },
    "Failed to remove `cache file`."
    );
    return this.#removeKey(key);
  }

  /**
   * @internal
   * Resolve the configurations.
   * Type checking, range checking, and the exclusion of null-related values ​​and unknown properties.
   * @param config 
   * @returns Resolved configurations.
   */
  #resolvConf(config: Config): Record<string, unknown> {
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
   * @throws  {@link FileCacheError}  If invalid `cache key', or file IO error.
   */
  async #set(key: string, data: Data): Promise<void> {
    await this.#access(key, () => {
      fs.writeFileSync(this.#getFilePath(key), JSON.stringify(data, null, "  "));
    },
    "Failed to write `cache file`."
    );
    if (key !== this.#keyForKeyManagement) return this.#addKey(key);
  }
}

/**
 * File cache error.
 */
export class FileCacheError extends Error {
  /**
   * Constructor.
   * @param msg   Error message.
   * @param param Parameters.
   */
  constructor(msg: string, param?: { code: string, cause?: unknown, key?: string }) { 
    super(msg);
    param?.code != null && (Object.assign(this, { code: param.code }));
    param?.cause != null && (Object.assign(this, { cause: param.cause }));
    param?.key != null && (Object.assign(this, { key: param.key }));
  }
};

/**
 * Invalid cache error.
 */
export class InvalidCache extends FileCacheError {
  static #defaultMsg: string = "Found an invalid `cache file`.";
  /**
   * Constructor.
   * @param msg   Error message. If null, use a default message("Found an invalid `cache file`.").
   * @param param Parameters.
   */
  constructor(msg: string | null = InvalidCache.#defaultMsg, param?: { cause?: unknown, key?: string } ) { 
    msg = msg || InvalidCache.#defaultMsg;
    const rParam = { code: 'EINVALIDCACHE' } as { code: string, cause?: unknown, key?: string };
    param?.cause && (rParam.cause = param?.cause);
    param?.key && (rParam.key = param?.key);
    super(msg, rParam);
  }
}
