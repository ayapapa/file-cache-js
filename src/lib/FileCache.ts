import fs from 'node:fs';
import path from 'node:path';
import { createContracts } from "@ayapapa-npm/contracts-js";
import { FileLock } from "@ayapapa-npm/file-locking-js";
const  { REQUIRE, VERIFY } = createContracts();

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
   * Default is `100`. Min is `100`;
   */
  retryIoIntervalMs?: number,

  /**
   * 
   */
  cacheDir?: string;

  withLock?: boolean;

  lockTimeoutMs?: number;

  lockTtlMs?: number;

  /**
   * 古いキャッシュの除去を実行する確率（割合）。
   * 例えば、`0.2`を指定した場合は、5回の操作（put, get, remove)で１回の除去が行われる。
   * Default is `0.2`. Min is `0`.
   */
  purgeProbability?: number;
};

/**
 * @internal
 * 
 */
type Data = {
  value: unknown,
  expiration: number,
}

/**
 * ファイルを使ったキャッシュサービスクラス。
 * 
 * 指定された`cache key`に紐づけて、指定され値をJSON形式で`cache file`に格納する。
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
  private static defaultConfig: Readonly<Required<Config>> = {
    ttlMs:              10 * 60 * 1000,
    retriesOnIoErr:     1,
    retryIoIntervalMs:  100,
    cacheDir:           path.join(process.cwd(), '.cache'),
    withLock:           true,
    lockTimeoutMs:      1000,
    lockTtlMs:          1000,
    purgeProbability:   0.20,
  }

  /**
   * Static methods.
   */
  public static getDefaultConf() {
    return { ...FileCache.defaultConfig };
  }
  
  /**
   * Instance fields.
   */

  /**
   * Current configurations.
   */
  #currentConfig: Required<Config> = { ...FileCache.defaultConfig };

  /**
   * パージ中フラグ
   */
  #purging = false;

  /**
   *  Instance mehods. 
   */

  /**
   * 
   * コンストラクタ
   * @param config  設定。
   * null系(nullまたはundefined)指定じは、省略したもととして扱う。
   */
  constructor(config: Config = FileCache.defaultConfig) {
    const rConf = {} as Record<string, unknown>;
    const defaultConf = FileCache.defaultConfig as Readonly<Record<string, unknown>>;
    // 型チェックおよびnull系プロパティ除外
    Object.entries(config).forEach(v => {
      if (v[1] != null) {
        REQUIRE(typeof v[1] === typeof defaultConf[v[0]], `Invalid ${v[0]}.`, FileCacheError, { code: 'EINVAL' });
        rConf[v[0]] = v[1];
      }
    });
    this.#currentConfig = { ...FileCache.defaultConfig, ...rConf};
    this.#currentConfig.ttlMs = Math.max(this.#currentConfig.ttlMs, 0);
    this.#currentConfig.retriesOnIoErr = Math.max(this.#currentConfig.retriesOnIoErr, 0);
    this.#currentConfig.retryIoIntervalMs = Math.max(this.#currentConfig.retryIoIntervalMs, 100);
    this.#currentConfig.lockTimeoutMs = Math.max(this.#currentConfig.lockTimeoutMs, 0);
    this.#currentConfig.lockTtlMs = Math.max(this.#currentConfig.lockTtlMs, 1000);
    this.#currentConfig.purgeProbability = Math.max(this.#currentConfig.purgeProbability, 0);
    this.#currentConfig.cacheDir = this.#getCacheDir();
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
      const cached = await this.#get(key) as Data;
      if (cached) {
        if (cached.expiration === 0 || cached.expiration > Date.now()) {
          return cached.value;
        }
        // 有効期限切れのため削除
        await this.#remove(key); 
      }
      return undefined;
    });
  }

  /**
   * キーと値をキャッシュに格納する
   * @param key     キー
   * If the specified `cache key` contains characters that are invalid for a file path, 
   * it is converted into a valid file path by replacing those characters with underscores 
   * and removing double quotation marks.
   * @param value   値
   */
  public async put(key: string, value: unknown) {
    REQUIRE(typeof key === 'string' && key.length > 0, "Invalid key.", FileCacheError, null, { code: 'EINVAL' });
    return this.#execute(key, async () => {
      const expiration = this.#currentConfig.ttlMs > 0 ? Date.now() + this.#currentConfig.ttlMs : 0;
      return this.#put(key, { value, expiration: expiration });
    }) as Promise<void>;
  }

  /**
   * キーに対応する値を削除する
   * @param key キー
   */
  public async remove(key: string) {
    REQUIRE(typeof key === 'string' && key.length > 0, "keyが不正", FileCacheError);
    return this.#execute(key, async () => {
      return this.#remove(key);
    }) as Promise<void>;
  }

  /**
   * キャッシュデータをファイルから取得する
   * @param key     キャッシュキー
   * @return 
   */
  async #get(key: string) {
    return this.#access(() => {
      const filePath = this.#getFilePath(key);
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Data;
      }
      return undefined;
    },
    "キャッシュデータの読み込みに失敗しました。"
    );
  }

  /**
   * キャッシュデータをファイルへ格納する
   * @param {string}  key     キャッシュキー
   * @param {{value: *, expiration: number}}       value   キャッシュする値
   * @param {boolean} [retry=false] trueならエラー時に再実行
   */
  async #put(key: string, data: Data): Promise<void> {
    return this.#access(() => {
      fs.writeFileSync(this.#getFilePath(key), JSON.stringify(data, null, "  "));
    },
    "キャッシュデータの書き込みに失敗しました。"
    ) as Promise<void>;
  }

  /**
   * @internal
   * File IO with retry.
   * @param callback  File IO callback.
   * @param msg       Error message.
   * @returns 
   */
  async #access(callback: () => unknown, msg: string) {
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
        let code = 'EIO';
        err instanceof Error && 'code' in err && (code = String(err.code));
        throw new FileCacheError(msg, { code, cause: err });
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
    return this.#access(() => {
      fs.unlinkSync(this.#getFilePath(key));
    },
    "キャッシュデータの削除に失敗しました。"
    );
  }

  /**
  * 処理実行
  * @param  key `cache key`
  * @param  callback
  * @return コールバック関数の戻り値
  */ 
  async #execute(key: string, callback: () => unknown) {
    this.#purgeRandom();
    if (this.#currentConfig.withLock) {
      //const lockKey = '62af9711-f49b-9bab-620e-fbf3055a9707';
      return await FileLock.withLock(key, callback, { 
        timeoutMs: this.#currentConfig.lockTimeoutMs,
        ttlMs: this.#currentConfig.lockTtlMs,
      });
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
      if (!dir) continue;
      // ディレクトリが存在するなら、それに決定。
      try {
        dir = path.resolve(dir);
        if (fs.existsSync(dir)) return dir;
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
  #purgeRandom() {
    if (this.#purging) return;
    if (Math.random() <= this.#currentConfig.purgeProbability) this.purge();
  }

  /**
   * 一定確率で古いキャッシュの一斉除去を行う 
   */
  public async purge(options?: { force?: boolean }) {
    this.#purging = true;
    try {
    // ロックする
    //return this.#execute(async () => {
      // 全リストを取得する(fsで出来る）
      const dir = this.#currentConfig.cacheDir;
      const list = await this.#access(
        () => fs.readdirSync(dir, { withFileTypes: true }), 
        "キャッシュディレクトリ情報の取得に失敗しました。"
      ) as fs.Dirent<string>[];
      const keys = list.filter(item => item.isFile()).map(item =>  path.parse(item.name).name);
      if (options?.force === true) {
        // 強制削除
        keys.forEach(async (key) => await this.remove(key));
      }
      else {
        // getすることで、古いものが削除される
        keys.forEach(async (key) => await this.get(key));
      }
    //}) as Promise<void>;
    }
    finally {
      this.#purging = false;
    }
  }



}


// キャッシュエラー
export class FileCacheError extends Error {
  /**
   * エラーコード。
   */
  public code: string = 'EUNKNOWN';
  public cause?: unknown;

  constructor(msg: string, param: { code: string, cause?: unknown }){ 
    super(msg);
    param?.code != null && (this.code = param.code);
    param?.cause != null && (this.cause = param.cause);
  }
};

