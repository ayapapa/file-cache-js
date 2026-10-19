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

export interface Config {
  /**
   * キャッシュ有効期間(ミリ秒)
   * `0`以下を指定した時は、有効期限なし。
   * Default is '600000'. Min is 0.
   */
  ttlMs?: number,

  /**
   * IOエラー時のリトライ回数。
   * Default is `1`. Min is `0`;
   */
  retriesOnIoErr?: number;

  /**
   * IOエラー時のリトライ間隔(ミリ秒)
   * Default is `100`. Min is `100`. Min未満はMinに調整される。
   */
  retryIoIntervalMs?: number,

  /**
   * 
   */
  cacheDir?: string;

  /**
   * `get`/`put`/`remove`時に、キャッシュファイルIO処理に排他制御を掛けるか否か
   */
  withLock?: boolean;

  /**
   * 排他制御のロック獲得までの最大待ち時間（コメントはコピーせよ）
   * withLockがtrueのときのみ有効。
   * Min設定あり。
   */
  lockTimeoutMs?: number;

  /**
   * 排他制御のロック獲得までの最大待ち時間（コメントはコピーせよ）
   * withLockがtrueのときのみ有効。
   * Min設定あり。
   */
  lockTtlMs?: number;

  /**
   * 古いキャッシュの除去を実行する確率（割合）。
   * 例えば、`0.2`を指定した場合は、5回の操作（put, get, remove)で１回の除去が行われる。
   * Default is `0.1`. Min is `0`. Max is `1.0`.　範囲外は、MinまたはMaxに調整される。
   */
  purgeProbability?: number;

  /**
   * 不正なキャッシュファイルを削除するか否か 。
   * See also `invalidTtlMs`.
   */
  removeInvalid?: boolean,

  /**
   * Validity period in milliseconds for the modification time of invalid `cache file`. <br>
   * If `removeInvalid` is true and the specified amount of time has elapsed since the modification time of an invalid `cache file`, it is forcibly deleted. 
   * Minimum is `0`.
   * Default is 10000.
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
 * ファイルを使ったキャッシュサービスクラス。
 * 
 * 指定された`cache key`に紐づけて、指定され値をJSON形式で`cache file`に格納する。
 * 値の型は、JSONに変換できるものに限ります。（Map, Set, Symbol, Bigint, Fnctionなどは、正常に変換できない（無視されたり、nullや、空オブジェクトになる）か、あるいは、エラーになります）
 * `cache file`は、"`cache key`.json"という名前で、`cache directory`下に格納される。
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
   * Current configurations.
   */
  #currentConfig: Required<Config> = { ...FileCache.#defaultConfig };

  /**
   * パージ中フラグ
   */
  #purging = false;

  /**
   *  Instance mehods. 
   */

  #resolvConf(config: Config) {
    const rConf = {} as Record<string, unknown>;
    const defaultConf = FileCache.#defaultConfig as Readonly<Record<string, unknown>>;
    // 型チェック、範囲チェック、および、null系と未知のプロパティを除外
    Object.entries(config).forEach(v => {
      const key = v[0];
      const value = v[1];
      if (value != null && defaultConf[key] != null) {
        // 型チェック
        REQUIRE(typeof value === typeof defaultConf[key], `Invalid ${key}.`, FileCacheError, { code: 'EINVAL' });
        let ok = true;
        if (typeof value === "number") {
          // 範囲チェック
          switch (key) {
            case 'ttlMs':            
            case 'retryIoIntervalMs':  
            case 'lockTimeoutMs':      
            case 'lockTtlMs':          
            case 'invalidTtlMs':      ok = Number.isFinite(value); break;
            case 'retriesOnIoErr':    ok = Number.isSafeInteger(value); break;
            case 'purgeProbability':  ok = Number.isFinite(value)/* && value >= 0 && value <= 1.0*/; break;
          }
          REQUIRE(ok, `Invalid ${key}.`, FileCacheError, { code: 'EOUTRANGE' });
        }
        // 解決済設定として保存
        rConf[key] = value;
      }
    });
    return rConf;
  }

  /**
   * 
   * コンストラクタ
   * @param config  設定。
   * 指定された値以外はデフォルト設定値になる。
   * null系(nullまたはundefined)指定時は、省略したもととして扱う。
   */
  constructor(config: Config = FileCache.#defaultConfig) {
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

  public getConfig(): Required<Config> {
    return {...this.#currentConfig };
  }

  /**
   * キーに対応する値を取得
   * @param key `cache key`
   * If the specified `cache key` contains characters that are invalid for a file path, 
   * it is converted into a valid file path by replacing those characters with underscores 
   * and removing double quotation marks.
   * @returns putした時の値を返すプロミス、または、存在しない場合はundefined.
   */
  public async get(key: string) {
    REQUIRE(typeof key === 'string' && key.length > 0, "Invalid key.", FileCacheError, null, { code: 'EINVAL' });
    return this.#execute(key, async () => {
        return await this.#get(key);
    });
  }
  /**
   * 全ての`cache key`とそれに対応する`cache value`を取得する。
   * @param options オプション。 <br>
   * - throwIfInvalid: `boolean`  true なら、不正キャッシュファイルを発見した際にエラーを投げる。
   * ただし、 不正`cache file`判定は、コンストラクト時の`Config`の`removeInvalid`および`invalidTtlMs`に依存する。(see also `Config`.)
   * @returns 取得に成功した`cache key`と`cache value`({`cache key`: `cache value`})を解決するプロミス。
   */
  public async getAll(options? : { throwIfInvalid?: boolean }): Promise<Record<string, unknown>> {
    const throwIfInvalid = options?.throwIfInvalid ?? false;
    const ret = {} as Record<string, unknown>;
    await this.#forAllKeys(async (key: string) => {
      try {
        const value = await this.get(key);
        if (value !== undefined) ret[key] = value;
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
    /*
    const keys = await this.#getAllKeys();
    for (const key of keys) {
      const value = await this.get(key);
      if (value !== undefined) ret[key] = value;
    }
    */
    return ret;
  }

  /**
   * キーと値をキャッシュに格納する
   * @param key     キー
   * If the specified `cache key` contains characters that are invalid for a file path, 
   * it is converted into a valid file path by replacing those characters with underscores 
   * and removing double quotation marks.
   * @param value   値
   * @param options オプション。
   * - ttlMs: number型。設定(config)に優先される。
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
   * キーに対応する値を削除する。
   * 不正キャッシュファイルである場合は、不正ファイル削除設定による（無効判断ならば、削除され`undefined`が返るし、さもなくばエラー。
   * @param key キー
   */
  public async remove(key: string) {
    REQUIRE(typeof key === 'string' && key.length > 0, "Invalid key.", FileCacheError, { code: 'EINVAL', key });
    return this.#execute(key, async () => {
      if (await this.#get(key) === undefined) return; // no action.
      return this.#remove(key);
    }) as Promise<void>;
  }

  /**
   * @internal
   * ファイルコンテンツを解析し、`cache key`に対応する値を取得する。
   * @param contents 
   * @param key 
   * @returns `cache key`に対応する値、または、`undefined`.
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
    if (cached.expiresAt === 0 || cached.expiresAt > Date.now()) {
      return cached.value; // 有効値
    }
    return undefined;
  }

  /**
   * キャッシュデータをファイルから取得する
   * @param key     キャッシュキー
   * @return 
   */
  async #get(key: string) {
    const filePath = this.#getFilePath(key);
    const contents = await this.#access(key, () => {
      if (!fs.existsSync(filePath)) return undefined;
      return fs.readFileSync(filePath, 'utf8');
    },
    "Failed to read `cache file`."
    ) as string | undefined;
    if (contents === undefined) return undefined;

    try {
      return this.#parse(contents, key);
    }
    catch (err) {
      // 不正ファイル削除指示を確認し有効・無効判定
      let expired = false;
      if (this.#currentConfig.removeInvalid === true) {
        // 更新時間をチェックし判定する
        const stat = await this.#access(
          key, 
          () => fs.statSync(this.#getFilePath(key), { throwIfNoEntry: false }),
          "Failed to get `cache file` information."
        ) as fs.Stats | undefined;
        expired = Boolean(stat && stat.mtimeMs + this.#currentConfig.invalidTtlMs <= Date.now())/* && await this.#remove(key)*/
      }
      if (expired === false) throw err;
    }
    // 有効期限切れのため削除
    await this.#remove(key); 
    return undefined;
  }

  /**
   * キャッシュデータをファイルへ格納する
   * @param {string}  key     キャッシュキー
   * @param {{value: *, expiresAt: number}}       value   キャッシュする値
   * @param {boolean} [retry=false] trueならエラー時に再実行
   */
  async #set(key: string, data: Data): Promise<void> {
    return this.#access(key, () => {
      fs.writeFileSync(this.#getFilePath(key), JSON.stringify(data, null, "  "));
    },
    "Failed to write `cache file`."
    ) as Promise<void>;
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
   * ファイルパスを取得する
   * @param {string}  key
   */
  #getFilePath(key: string) {
    const encodedKey = key.replace(/[<>:/\\|?*]/g, () => '_').replace(/"/g, () => '');
    return path.join(this.#currentConfig.cacheDir, `${encodedKey}.json`)
  }

  /**
   * キャッシュデータをファイルへ格納する
   * @param  key     キャッシュキー
   */
  async #remove(key: string) {
    const path = this.#getFilePath(key)
    return this.#access(key, () => {
      fs.existsSync(path) && fs.unlinkSync(path);
    },
    "Failed to remove `cache file`."
    );
  }

  /**
  * 処理実行
  * @param  key `cache key`
  * @param  callback
  * @return コールバック関数の戻り値
  */ 
  async #execute(key: string, callback: () => unknown) {
    await this.#purgeRandom();
    if (this.#currentConfig.withLock) {
      try {
        return await FileLock.withLock(key, callback, { 
          timeoutMs: this.#currentConfig.lockTimeoutMs,
          ttlMs: this.#currentConfig.lockTtlMs,
        });
      }
      catch (err) {
        if (err instanceof FileCacheError) throw err;
        else throw new FileCacheError("Failed to acquire the lock.", { code: "ELOCK", key, cause: err });
      }
    }
    return callback();
  }


  /**
   * キャッシュデータ格納ディレクトリパスを取得する
   * @returns {string}
   */
  #getCacheDir() {
    // ディレクトリ探索方針（優先順位順）
    // 1. 指定ディレクトリ
    // 2. 作業ディレクトリ(`process.cwd()`)/.cache
    const candidates = [
      () => this.#currentConfig.cacheDir,
      () => path.join(process.cwd(), '.cache'),
    ];

    // ディレクトリ探索開始
    for (const getDir of candidates) {
      // ディレクトリ指定なしなら次
      let dir = getDir();
      //if (!dir) continue;
      // ディレクトリが存在するなら、それに決定。
      try {
        dir = path.resolve(dir);
        if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) return dir;
        // 無い場合は、ディレクトリを作成できたなら、それに決定。
        fs.mkdirSync(dir, { recursive: true });
        return dir;
      }
      catch (err) {
        continue;
      }
    }
    // キャッシュデータ格納ディレクトリ生成失敗
    throw new FileCacheError("キャッシュデータ格納ディレクトリの作成に失敗しました。", { code: 'ECREATECACHEDIR' });
  }

  /**
   * 一定確率で古いキャッシュの一斉除去を行う 
   */
  async #purgeRandom() {
    if (Math.random() <= this.#currentConfig.purgeProbability) await this.purge();
  }

  async #getAllKeys() {
    // 全リストを取得する
    const dir = this.#currentConfig.cacheDir;
    const list = await this.#access(null, 
      () => fs.readdirSync(dir, { withFileTypes: true }), 
      "Failed to read `cache directory` information."
    ) as fs.Dirent<string>[];
    return list.filter(item => item.isFile()).map(item =>  path.parse(item.name).name);
  }

  /**
   * 一定確率で古いキャッシュの一斉除去を行う 
   * @param options オプション
   * - force: `boolean` `true`なら、不正キャッシュファイルを除き、すべて削除。
   * ただし、 不正`cache file`判定は、コンストラクト時の`Config`の`removeInvalid`および`invalidTtlMs`に依存する。(see also `Config`.)
   */
  public async purge(options?: { force?: boolean }) {
    if (this.#purging) return;
    this.#purging = true;
    const failures = {} as Record<string, unknown>;
    try {
      //const keys = await this.#getAllKeys();
      if (options?.force === true) {
        await this.#forAllKeys(async (key: string) => {
          try {
            await this.remove(key);
          }
          catch (err) {
            failures[key] = err;
          }
        });
        /*
        // 強制削除
        for (const key of keys) {
          await this.remove(key);
        }
        */
      }
      else {
        // getすることで、古いものが削除される
        await this.#forAllKeys(async (key: string) => {
          try {
            await this.get(key);
          }
          catch (err) {
            failures[key] = err;
          }
        });
        //keys.forEach(async (key) => await this.get(key));
      }
    }
    finally {
      this.#purging = false;
    }
    return failures;
  }

  async #forAllKeys(action: (key: string) => Promise<void>) {
    const keys = await this.#getAllKeys();
    for (const key of keys) {
      await action(key);
    }
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
