import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FileCache, { FileCacheError, type Config } from '../src/index.ts';

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(async () => {
  vi.restoreAllMocks();
  const cache = new FileCache();
  await cache.purge({ force: true })
});

type successCallback = 
  ((result: unknown, cache: FileCache) => void | Promise<void>) | 
  ((result: unknown, cache: FileCache) => void | Promise<void>)[];

describe('FileCache', () => {

  function getCacheFilePath(key: string) {
    return path.join(process.cwd(), '.cache', `${key}.json`);
  }
  
  /** 不正ファイルを作成し、getまたはgetALlのテストを行う */
  async function testInvalid(
    key: string, 
    data: Record<string, unknown> | string, 
    action: (cache: FileCache, key?: string) => Promise<unknown>,
    errorObj: Record<string, unknown>, 
    success?: successCallback,
    config?: Config
  ) {
    const conf = { ...config, ...{ purgeProbability: 0 } }
    const cache = new FileCache(conf);
    const path = getCacheFilePath(key);
    fs.writeFileSync(path, typeof data === 'string' ? data : JSON.stringify(data, null, '  '));
    const successCbs = (success == null ? [] : (!Array.isArray(success) ? [success] : success));
    expect.assertions(successCbs.length === 0 ? 3 : successCbs.length);
    try {
      const res = await action(cache, key);
      for (const cb of successCbs)
        await cb(res, cache);
    }
    catch (err) {
      expect(success).toBeUndefined();
      expect(err).instanceOf(FileCacheError);
      expect(err).toMatchObject(errorObj);
    }
  }

  // 不正キャッシュファイル発見時
  // invaldTtlMs登場ですかなぁ。。。。
  it("不正なキャッシュファイル(valueが無い)", async () => {
    // valueが無いのは、undefinedということなので、エラーではない。
    const key = 'invalidNoValue';
    await testInvalid(key, 
      { "expiresAt": Date.now() + 1000 },
      async (cache: FileCache) => await cache.get(key),
      {},
      result => expect(result === undefined && fs.existsSync(getCacheFilePath(key)) === true).toBeTruthy()
    );
    fs.unlinkSync(getCacheFilePath(key));
  });

  it("不正なキャッシュファイル(expiresAtが無い)", async () => {
    const key = 'invalidNoexpiresAt';
    await testInvalid(key, {
      value: { hoge: 123 },
      //"expiresAt": Date.now() - 100
    },
    async (cache: FileCache) => await cache.get(key),
    {
      code: 'EINVALIDCACHE',
      message: "Found an invalid `cache file`.",
      key
    });
    fs.unlinkSync(getCacheFilePath(key));
  });

  it("不正なキャッシュファイル(空ファイル)", async () => {
    const key = 'invalidJson';
    await testInvalid(key, "", async (cache: FileCache) => await cache.get(key), {
      code: 'EINVALIDCACHE',
      message: "Found an invalid `cache file`.",
      key,
      cause: {
        message: "Unexpected end of JSON input",
      }
    });
    fs.unlinkSync(getCacheFilePath(key));
  });

  it("不正なキャッシュファイル(JSONでない)", async () => {
    const key = 'invalidJson';
    await testInvalid(key, "()", async (cache: FileCache) => await cache.get(key), {
      code: 'EINVALIDCACHE',
      message: "Found an invalid `cache file`.",
      key,
      cause: {
        message: "Unexpected token '(', \"()\" is not valid JSON",
      }
    });
    fs.unlinkSync(getCacheFilePath(key));
  });

/**/ 
  it("不正なキャッシュファイル(getAll)", async () => {
    const key = 'invalidJsonGetAll';
    await testInvalid(
      key, 
      "()", 
      async (cache: FileCache) => await cache.getAll({ throwIfInvalid: true }), {
      code: 'EINVALIDCACHE',
      message: "Found an invalid `cache file`.",
      key,
      cause: {
        message: "Unexpected token '(', \"()\" is not valid JSON",
      }
    });
    fs.unlinkSync(getCacheFilePath(key));
  });
/**/
  it("不正なキャッシュファイル(getAll no throw)", async () => {
    const key = 'invalidJsonGetAllNoThrow';
    await testInvalid(key, "()", async (cache: FileCache) => await cache.getAll({ throwIfInvalid: false }), {
      code: 'EINVALIDCACHE',
      message: "Found an invalid `cache file`.",
      key,
      cause: {
        message: "Unexpected token '(', \"()\" is not valid JSON",
      },
    },
    result => expect((result as Record<string, unknown>)[key]).toBeUndefined(),
    );
    fs.unlinkSync(getCacheFilePath(key));
  });

  it("不正なキャッシュファイルかつ無効=>get()=>削除されるはず", async () => {
    // 不正ファイルを作り、更新時間を過去に設定し、無効と判定させる
    const key = 'invalidFile';
    await testInvalid(key, 
      "",
      async (cache: FileCache) => {
        const cachePath = getCacheFilePath(key);
        try {
          const d = new Date(Date.now() - 2500);
          fs.utimesSync(cachePath, d, d);
        }
        catch (err) {
          console.log(err);
        }
        return await cache.get(key);
      },
      {},
      result => expect(result === undefined && fs.existsSync(getCacheFilePath(key)) === false).toBeTruthy(),
      { removeInvalid: true, invalidTtlMs: 0 } 
    );
  });

  async function testIOError(
    key: string, 
    value: unknown, 
    errFunc: 'readFileSync' | 'writeFileSync' | 'readdirSync' | 'existsSync' | 'unlinkSync', 
    mockCb: (args: unknown[]) => unknown,
    errObj: Record<string, unknown>,
    //finCb: () => void,
  ) {
    const cacheFilePath = getCacheFilePath(key);
    const cacheDirPath = path.join(process.cwd(), '.cache');
    const orgFunc = fs[errFunc] as ((...args: unknown[]) => unknown);
    const spy = vi.spyOn(fs, errFunc).mockImplementation((...args: unknown[]) => {
      //return mockCb(orgFunc as ((...args: unknown[]) => unknown), args);
      const checkPath = errFunc === 'readdirSync' ? cacheDirPath : cacheFilePath;
      if (args[0] as string === checkPath)
        return mockCb(args);
      else 
        return orgFunc(...args);
    });
    try {
      const cache = new FileCache();
      await cache.set(key, value);
      await cache.get(key);
      await cache.remove(key);
      await cache.getAll();
    }
    catch (err) {
      expect(err).instanceOf(FileCacheError);
      expect(err).toMatchObject(errObj);
    }
    finally {
      spy.mockRestore();
      try { fs.unlinkSync(cacheFilePath) } catch (_) {;};
    }

  }

  // File IO(read, write, readdir, unlink)エラーテスト
  it("readFileSyncエラー", async () => {
    const key = "readFileSyncError";
    //const cacheFilePath = getCacheFilePath(key);
    await testIOError(key, "readFileSyncエラー", 'readFileSync', 
      (_args: unknown[]) => {
        throw Object.assign(new Error("Error!"), { code: "EHOGE" });
      }, {
        code: "EHOGE",
        key,
        message: "Failed to read `cache file`.",
        cause: {
          code: "EHOGE",
          message: "Error!",
        }
      },
      //() => {try { fs.unlinkSync(cacheFilePath) } catch (_) {;} },
    );
  });

  it("writeSyncエラー", async () => {
    const key = "writeFileSyncError";
    //const cacheFilePath = getCacheFilePath(key);
    await testIOError(key, "writeSyncエラー", 'writeFileSync', 
      (_args: unknown[]) => {
        throw Object.assign(new Error("Error!"), { code: "EHOGE" });
      }, {
        code: "EHOGE",
        key,
        message: "Failed to write `cache file`.",
        cause: {
          code: "EHOGE",
          message: "Error!",
        }
      },
      //() => {try { fs.unlinkSync(cacheFilePath) } catch (_) {;} },
    );
  });

  it("unlinkSyncエラー", async () => {
    const key = "unlinkSyncError";
    //const cacheFilePath = getCacheFilePath(key);
    await testIOError(key, "unlinkSyncエラー", 'unlinkSync', 
      (_args: unknown[]) => {
        throw Object.assign(new Error("Error!"), { code: "EHOGE" });
      }, {
        code: "EHOGE",
        key,
        message: "Failed to remove `cache file`.",
        cause: {
          code: "EHOGE",
          message: "Error!",
        }
      },
      //() => {try { fs.unlinkSync(cacheFilePath) } catch (_) {;} },
    );
  });

  it("existsSyncエラー", async () => {
    const key = "existsSyncError";
    //const cacheFilePath = getCacheFilePath(key);
    await testIOError(key, "existsSyncエラー", 'existsSync', 
      (_args: unknown[]) => {
        throw Object.assign(new Error("Error!"), { code: "EHOGE" });
      }, {
        code: "EHOGE",
        key,
        message: "Failed to read `cache file`.",
        cause: {
          code: "EHOGE",
          message: "Error!",
        }
      },
      //() => {try { fs.unlinkSync(cacheFilePath) } catch (_) {;} },
    );
  });

  it("readdirSyncエラー", async () => {
    const key = "readdirSyncError";
    //const cacheFilePath = getCacheFilePath(key);
    await testIOError(key, "readdirSyncエラー", 'readdirSync', 
      (_args: unknown[]) => {
        throw Object.assign(new Error("Error!"), { code: "EHOGE" });
      }, {
        code: "EHOGE",
        message: "Failed to read `cache directory` information.",
        cause: {
          code: "EHOGE",
          message: "Error!",
        }
      },
      //() => {try { fs.unlinkSync(cacheFilePath) } catch (_) {;} },
    );
  });

  // ロックエラー
  it("ロックエラー", async () => {
    // 故意にファイルを作り、エラーを誘う（tmpファイルでいいかも
    const key = 'lockError';
    const lockPath = path.join(process.cwd(), '.lock', key + '.json.tmp');
    fs.writeFileSync(lockPath, "");
    try {
      const cache = new FileCache({ withLock: true, lockTimeoutMs: 100 });
      await cache.set(key, "hogege");
    }
    catch (err) {
      expect(err).instanceOf(FileCacheError);
      expect(err).toMatchObject({
        code: 'ELOCK',
        key,
        message: "Failed to acquire the lock.",
        cause: {
          code: "EALREADYLOCKED",
          key,
          message: "The `lock file` already exists and may still be updating.",
          reason: "Updating"
        }
      });
    }
    finally {
      fs.unlinkSync(lockPath);
    }
  });

  
  // ★★★purge force: false で、不正キャッシュあり（有効判断）
  it("purge({ force: false })で、不正キャッシュあり（有効判断）。", async () => {
    const key = "FileCache_purge_invalidCache";
    const key2 = "FileCache_purge_invalidCache2";
    try {
      await testInvalid(
        key,
        "",
        async (cache: FileCache) => {
          await cache.set(key2, "dummy");
          return await cache.purge({ force: false });
        },
        {},
        [
          (result: unknown) => {
            const failures = result as Record<string, unknown>;
            expect(failures[key]).toMatchObject({
              code: "EINVALIDCACHE",
              key,
              message: "Found an invalid `cache file`.",
            });
          },
          async (_, cache: FileCache) => {
            // 正常キャッシュは1個だけ
            expect(Object.keys(await cache.getAll()).length).toBe(1);
          }
        ]
      );
    }
    finally {
      try {fs.unlinkSync(getCacheFilePath(key))} catch(_e){;};
    }
  });

  // ★★★purge force: true、不正キャッシュあり（有効判断）
  it("purge({ force: true })で、不正キャッシュあり（有効判断）。", async () => {
    const key = "FileCache_purge_invalidCache_force";
    const key2 = "FileCache_purge_invalidCache_force2";
    try {
      await testInvalid(
        key,
        "",
        async (cache: FileCache) => {
          await cache.set(key2, "dummy");
          return await cache.purge({ force: true });
        },
        {},
        [
          (result: unknown) => {
            const failures = result as Record<string, unknown>;
            expect(failures[key]).toMatchObject({
              code: "EINVALIDCACHE",
              key,
              message: "Found an invalid `cache file`.",
            });
          },
          async (_, cache: FileCache) => {
            // key2に対応するキャッシュファイルは削除されているはず。
            expect(Object.keys(await cache.getAll()).length).toBe(0);
          }
        ]
      );
    }
    finally {
      try {fs.unlinkSync(getCacheFilePath(key))} catch(_e){;};
    }
  });

  // ★★★purge force: false で、不正キャッシュあり（無効判断）
  // fs.utimesSync を使って、更新時間を過去に設定する。　不正ファイル削除モードにする。

  // ★★★purge force: true、不正キャッシュあり（無効判断）
  // fs.utimesSync を使って、更新時間を過去に設定する。　不正ファイル削除モードにする。

  // ★★★purge で、unlinkSync error
  // これは、即時エラーで良いでしょうね。。それとも、failuresに記録する？？　どっちが良いかな？？
  
});
