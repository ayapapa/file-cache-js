import fs from 'node:fs';
import path from 'node:path';
import { FileLock } from '@ayapapa-npm/file-locking-js';
import { createContracts } from "@ayapapa-npm/contracts-js";
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
};

/**
 * ファイルを使ったキャッシュサービス実装クラス。
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
  }

  /**
   * Instance fields.
   */

  /**
   * Current configurations.
   */
  #currentConfig: Required<Config> = { ...FileCache.defaultConfig };

  /**
   *  Instance mehods. 
   */

  /**
   * 
   * コンストラクタ
   * @param config  設定。
   */
  constructor(config: Config = FileCache.defaultConfig) {
    this.#currentConfig = { ...FileCache.defaultConfig, ...config};
    this.#currentConfig.ttlMs = Math.max(this.#currentConfig.ttlMs, 0);
    this.#currentConfig.retriesOnIoErr = Math.max(this.#currentConfig.retriesOnIoErr, 0);
    this.#currentConfig.retryIoIntervalMs = Math.max(this.#currentConfig.retryIoIntervalMs, 100);
    this.#currentConfig.cacheDir = this.#currentConfig.cacheDir;
    this.#currentConfig.lockTimeoutMs = Math.max(this.#currentConfig.lockTimeoutMs, 0);
    this.#currentConfig.lockTtlMs = Math.max(this.#currentConfig.lockTtlMs, 1000);

    // キャッシュディレクトリ解決
    this.#currentConfig.cacheDir = this.#getCacheDir();
  }

  /**
   * キーに対応する値を取得
   * @param key 
   * @returns putした時の値を返すプロミス、または、存在しない場合はundefined.
   */
  public async get(key: string) {
    REQUIRE(typeof key === 'string' && key.length > 0, "Invalid key.", FileCacheError, null, { code: 'EINVAL' });
    return this.#execute(async () => {
      const cached = await this.#get(key)
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
   * @param value   値
   */
  public async put(key: string, value: unknown) {
    REQUIRE(typeof key === 'string' && key.length > 0, "Invalid key.", FileCacheError, null, { code: 'EINVAL' });
    return this.#execute(async () => {
      const expiration = this.#currentConfig.ttlMs > 0 ? Date.now() + this.#currentConfig.ttlMs : 0;
      return this.#put(key, { value: value, expiration: expiration });
    });
  }

  /**
   * キーに対応する値を削除する
   * @param key キー
   */
  public async remove(key: string) {
    REQUIRE(typeof key === 'string' && key.length > 0, "keyが不正", FileCacheError);
    return this.#execute(async () => {
      return this.#remove(key);
    });
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
        return JSON.parse(fs.readFileSync(filePath, 'utf8')) as { value: unknown, expiration: number };
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
  async #put(key: string, data: { value: unknown, expiration: number }) {
    return this.#access(() => {
      fs.writeFileSync(this.#getFilePath(key), JSON.stringify(data));
    },
    "キャッシュデータの書き込みに失敗しました。"
    );
  }

  /**
   * @internal
   * File IO with retry.
   * @param callback  File IO callback.
   * @param msg       Error message.
   * @returns 
   */
  async #access<T>(callback: () => T, msg: string): Promise<T> {
    let retries = this.#currentConfig.retriesOnIoErr;
    const interval = this.#currentConfig.retryIoIntervalMs;
    try {
      return callback();
    }
    catch (err) {
      if (retries-- > 0) {
        await sleepAsync(interval);
        return this.#access(callback, msg);
      }
      let code = 'EIO';
      err instanceof Error && 'code' in err && (code = String(err.code));
      throw new FileCacheError(msg, { code, cause: err });
    }
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
  * @param  callback
  * @return コールバック関数の戻り値
  */ 
  async #execute(callback: () => unknown): Promise<unknown> {
    if (this.#currentConfig.withLock) {
      const lockKey = '62af9711-f49b-9bab-620e-fbf3055a9707';
      return await FileLock.withLock(lockKey, callback, { 
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
      dir = path.resolve(dir);
      if (fs.existsSync(dir)) return dir;
      // 無い場合は、ディレクトリを作成できたなら、それに決定。
      try {
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

