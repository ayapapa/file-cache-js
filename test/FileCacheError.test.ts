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
  
  /** Create a cache file with the specified content and perform a test. */
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

  it("Invalid cache file (missing 'value').", async () => {
    // The absence of a value means it is "undefined," so it is not an error.
    const key = 'invalidNoValue';
    await testInvalid(key, 
      { "expiresAt": Date.now() + 1000 },
      async (cache: FileCache) => await cache.get(key),
      {},
      result => expect(result === undefined && fs.existsSync(getCacheFilePath(key)) === true).toBeTruthy()
    );
    fs.unlinkSync(getCacheFilePath(key));
  });

  it("Invalid cache file (missing `expiresAt`).", async () => {
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

  it("Invalid cache file (empty file).", async () => {
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

  it("Invalid cache file (not JSON).", async () => {
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

  it("Invalid cache file (getAll).", async () => {
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

  it("Corrupt cache file (getAll no throw).", async () => {
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

  it("Invalid old cache file => get() => should be deleted", async () => {
    // Create a malicious file, set its modification timestamp to a past date, 
    // and cause it to be flagged as invalid.
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

  /**
   * IO error test.
   * @param key 
   * @param value 
   * @param errFunc 
   * @param mockCb 
   * @param errObj 
   */
  async function testIOError(
    key: string, 
    value: unknown, 
    errFunc: 'readFileSync' | 'writeFileSync' | 'readdirSync' | 'existsSync' | 'unlinkSync', 
    mockCb: (args: unknown[]) => unknown,
    errObj: Record<string, unknown> | null,
    actionCb?: (cache: FileCache) => unknown,
    actionCbAssertions: number = 0,
  ) {
    const cacheFilePath = getCacheFilePath(key);
    const cacheDirPath = path.join(process.cwd(), '.cache');
    const orgFunc = fs[errFunc] as ((...args: unknown[]) => unknown);
    const spy = vi.spyOn(fs, errFunc).mockImplementation((...args: unknown[]) => {
    const checkPath = errFunc === 'readdirSync' ? cacheDirPath : cacheFilePath;
      if (args[0] as string === checkPath)
        return mockCb(args);
      else 
        return orgFunc(...args);
    });
    expect.assertions(actionCbAssertions + (errObj != null ? 3 : 0))
    try {
      const cache = new FileCache();
      if (actionCb) {
        await actionCb(cache);
      }
      else {
        await cache.set(key, value);
        await cache.get(key);
        await cache.remove(key);
        await cache.getAll();
      }
    }
    catch (err) {
      expect(errObj).not.toBeNull();
      expect(err).instanceOf(FileCacheError);
      if (errObj) {
        expect(err).toMatchObject(errObj);
      }
    }
    finally {
      spy.mockRestore();
      try { fs.unlinkSync(cacheFilePath) } catch (_) {;};
    }
  }

  it("readFileSync error.", async () => {
    const key = "readFileSyncError";
    await testIOError(key, "readFileSyncError", 'readFileSync', 
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
    );
  });

  it("writeSync error", async () => {
    const key = "writeFileSyncError";
    await testIOError(key, "writeSyncError", 'writeFileSync', 
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
    );
  });

  it("unlinkSyncError", async () => {
    const key = "unlinkSyncError";
    await testIOError(key, "unlinkSyncError", 'unlinkSync', 
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
    );
  });

  it("existsSyncError", async () => {
    const key = "existsSyncError";
    await testIOError(key, "existsSyncError", 'existsSync', 
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
    );
  });

  it("readdirSyncError", async () => {
    const key = "readdirSyncError";
    await testIOError(key, "readdirSyncError", 'readdirSync', 
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
    );
  });

  it("Lock error.", async () => {
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

  it("purge({ force: false }); invalid cache files identified.", async () => {
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
            expect(Object.keys(await cache.getAll()).length).toBe(1);
          }
        ]
      );
    }
    finally {
      try {fs.unlinkSync(getCacheFilePath(key))} catch(_e){;};
    }
  });

  it("purge({ force: true }); invalid cache files identified.", async () => {
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
            // The cache file corresponding to key2 should have been deleted.
            expect(Object.keys(await cache.getAll()).length).toBe(0);
          }
        ]
      );
    }
    finally {
      try {fs.unlinkSync(getCacheFilePath(key))} catch(_e){;};
    }
  });

  it("purge({ force: false }); old invalid cache files.", async () => {
    const key = "FileCache_purge_oldInvalidCache";
    const key2 = "FileCache_purge_oldInvalidCache2";
    try {
      await testInvalid(
        key,
        "",
        async (cache: FileCache) => {
          const d = new Date(Date.now() - 2500);
          fs.utimesSync(getCacheFilePath(key), d, d);
          await cache.set(key2, "dummy");
          return await cache.purge({ force: false });
        },
        {},
        [
          (result: unknown) => {
            const failures = result as Record<string, unknown>;
            expect(failures).toBeUndefined();
          },
          async (_, cache: FileCache) => {
            // The cache file corresponding to key2 should exist.
            expect(Object.keys(await cache.getAll()).length).toBe(1);
          }
        ],
        { removeInvalid: true, invalidTtlMs: 0 }
      );
    }
    finally {
      try {fs.unlinkSync(getCacheFilePath(key))} catch(_e){;};
    }
  });

  it("purge({ force: true }); old invalid cache files.", async () => {
    const key = "FileCache_purge_oldInvalidCache_force";
    const key2 = "FileCache_purge_oldInvalidCache_force2";
    try {
      await testInvalid(
        key,
        "",
        async (cache: FileCache) => {
          const d = new Date(Date.now() - 2500);
          fs.utimesSync(getCacheFilePath(key), d, d);
          await cache.set(key2, "dummy");
          return await cache.purge({ force: true });
        },
        {},
        [
          (result: unknown) => {
            const failures = result as Record<string, unknown>;
            expect(failures).toBeUndefined();
          },
          async (_, cache: FileCache) => {
            // The cache file corresponding to key2 should exist.
            expect(Object.keys(await cache.getAll()).length).toBe(0);
          }
        ],
        { removeInvalid: true, invalidTtlMs: 0 }
      );
    }
    finally {
      try {fs.unlinkSync(getCacheFilePath(key))} catch(_e){;};
    }
  });

  it("purge({ force: true }), unlinkSync error.", async () => {
    const key = "purge_unlinkSyncError";
    await testIOError(key, "purge_unlinkSyncError", 'unlinkSync', (_args: unknown[]) => {
      throw Object.assign(new Error("Error!"), { code: "EHOGE" });
    }, null, async (cache: FileCache) => {
      await cache.set(key, 123456);
      const f = await cache.purge( { force: true });
      expect(f != null && f[key] !== undefined).toBeTruthy();
      expect((f as Record<string, unknown>)[key]).toMatchObject({
        code: "EHOGE",
        key,
        message:"Failed to remove `cache file`."
      })
    }, 2);
  });
  
});
