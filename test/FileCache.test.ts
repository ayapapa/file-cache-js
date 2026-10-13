import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileCache, /*type Config as FileCacheConfig*/ } from '../src/index.ts';
import { FileCacheError, sleepAsync } from '../src/lib/FileCache.ts';

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FileCache', () => {

  it("初期設定", async () => {
    const cache = new FileCache();
    expect(cache.getConfig()).toMatchObject({
      ttlMs:              10 * 60 * 1000,
      retriesOnIoErr:     1,
      retryIoIntervalMs:  100,
      cacheDir:           path.join(process.cwd(), '.cache'),
      withLock:           true,
      lockTimeoutMs:      1000,
      lockTtlMs:          1000,
      purgeProbability:   0.2
    })
  });

  it("Min設定", async () => {
    const cache = new FileCache({
      ttlMs:              -999,
      retriesOnIoErr:     -555,
      retryIoIntervalMs:  -1,
      lockTimeoutMs:      -99,
      lockTtlMs:          -100,
      purgeProbability:   -0.2
    });
    expect(cache.getConfig()).toMatchObject({
      ttlMs:              0,
      retriesOnIoErr:     0,
      retryIoIntervalMs:  100,
      lockTimeoutMs:      0,
      lockTtlMs:          1000,
      purgeProbability:   0
    })
  });

  function testInvalidConf(name: string, value: unknown, exptected?: unknown) {
    const defaultConf = FileCache.getDefaultConf() as Record<string, unknown>;
    const conf: Record<string, unknown> = {};
    conf[name] = value;
    if (value == null) expect.assertions(1);
    else expect.assertions(2)
    try {
      const cache = new FileCache(conf);
      const curConf = cache.getConfig() as Record<string, unknown>;
      expect(curConf[name]).toBe(exptected ?? defaultConf[name])
    }
    catch (err) {
      expect(err).instanceOf(FileCacheError);
      expect(err).toMatchObject({
        code: 'EINVAL',
        message: `[REQUIRE] Invalid ${name}.`
      });
    }
  }

  it("null ttlMs", async () => {
    testInvalidConf("ttlMs", null);
  });

  it("undefined ttlMs", async () => {
    testInvalidConf("ttlMs", undefined);
  });

  it("string ttlMs", async () => {
    testInvalidConf("ttlMs", "string");
  });

  it("object ttlMs", async () => {
    testInvalidConf("ttlMs", { hoge: 123 });
  });

  it("array ttlMs", async () => {
    testInvalidConf("ttlMs", [ 0, 1, "eee" ]);
  });


  it("null retriesOnIoErr", async () => {
    testInvalidConf("retriesOnIoErr", null);
  });

  it("undefined retriesOnIoErr", async () => {
    testInvalidConf("retriesOnIoErr", undefined);
  });

  it("string retriesOnIoErr", async () => {
    testInvalidConf("retriesOnIoErr", "string");
  });

  it("object retriesOnIoErr", async () => {
    testInvalidConf("retriesOnIoErr", { hoge: 123 });
  });

  it("array retriesOnIoErr", async () => {
    testInvalidConf("retriesOnIoErr", [ 0, 1, "eee" ]);
  });
  

  it("null retryIoIntervalMs", async () => {
    testInvalidConf("retryIoIntervalMs", null);
  });

  it("undefined retryIoIntervalMs", async () => {
    testInvalidConf("retryIoIntervalMs", undefined);
  });

  it("string retryIoIntervalMs", async () => {
    testInvalidConf("retryIoIntervalMs", "string");
  });

  it("object retryIoIntervalMs", async () => {
    testInvalidConf("retryIoIntervalMs", { hoge: 123 });
  });

  it("array retryIoIntervalMs", async () => {
    testInvalidConf("retryIoIntervalMs", [ 0, 1, "eee" ]);
  });


  it("null cacheDir", async () => {
    testInvalidConf("cacheDir", null);
  });

  it("undefined cacheDir", async () => {
    testInvalidConf("cacheDir", undefined);
  });

  it("number cacheDir", async () => {
    testInvalidConf("cacheDir", 1234);
  });

  it("object cacheDir", async () => {
    testInvalidConf("cacheDir", { hoge: 123 });
  });

  it("array cacheDir", async () => {
    testInvalidConf("cacheDir", [ 0, 1, "eee" ]);
  });


  it("null withLock", async () => {
    testInvalidConf("withLock", null);
  });

  it("undefined withLock", async () => {
    testInvalidConf("withLock", undefined);
  });

  it("number withLock", async () => {
    testInvalidConf("withLock", 1234);
  });

  it("object withLock", async () => {
    testInvalidConf("withLock", { hoge: 123 });
  });

  it("array withLock", async () => {
    testInvalidConf("withLock", [ 0, 1, "eee" ]);
  });

  
  it("null lockTimeoutMs", async () => {
    testInvalidConf("lockTimeoutMs", null);
  });

  it("undefined lockTimeoutMs", async () => {
    testInvalidConf("lockTimeoutMs", undefined);
  });

  it("string lockTimeoutMs", async () => {
    testInvalidConf("lockTimeoutMs", "hello");
  });

  it("boolean lockTimeoutMs", async () => {
    testInvalidConf("lockTimeoutMs", true);
  });

  it("object lockTimeoutMs", async () => {
    testInvalidConf("lockTimeoutMs", { hoge: 123 });
  });

  it("array lockTimeoutMs", async () => {
    testInvalidConf("lockTimeoutMs", [ 0, 1, "eee" ]);
  });
  

  it("null lockTtlMs", async () => {
    testInvalidConf("lockTtlMs", null);
  });

  it("undefined lockTtlMs", async () => {
    testInvalidConf("lockTtlMs", undefined);
  });

  it("string lockTtlMs", async () => {
    testInvalidConf("lockTtlMs", "hello");
  });

  it("boolean lockTtlMs", async () => {
    testInvalidConf("lockTtlMs", true);
  });

  it("object lockTtlMs", async () => {
    testInvalidConf("lockTtlMs", { hoge: 123 });
  });

  it("array lockTtlMs", async () => {
    testInvalidConf("lockTtlMs", [ 0, 1, "eee" ]);
  });

  
  it("null purgeProbability", async () => {
    testInvalidConf("purgeProbability", null);
  });

  it("undefined purgeProbability", async () => {
    testInvalidConf("purgeProbability", undefined);
  });

  it("string purgeProbability", async () => {
    testInvalidConf("purgeProbability", "hello");
  });

  it("boolean purgeProbability", async () => {
    testInvalidConf("purgeProbability", true);
  });

  it("object purgeProbability", async () => {
    testInvalidConf("purgeProbability", { hoge: 123 });
  });

  it("array purgeProbability", async () => {
    testInvalidConf("purgeProbability", [ 0, 1, "eee" ]);
  });
/*
       purgeProbability:   0.2
*/
  
  async function testPutAndTest(key: string, value: unknown) {
    const cache = new FileCache();
    await cache.put(key, value);
    expect.assertions(1);
    try {
      if (value == null || typeof value === "number" || typeof value === "string")
        expect(await cache.get(key)).toBe(value);
      else
        expect(await cache.get(key)).toMatchObject(value);
    }
    catch (err) {
      console.log(err);
    }
  }

  it("キャッシュput&get(object).", async () => {
    const key = "FileCache_putget_object";
    const value = { test: 1, hoge: "hello" };
    await testPutAndTest(key, value);
  });

  it("キャッシュput&get(number).", async () => {
    const key = "FileCache_putget_number";
    const value = 1009;
    await testPutAndTest(key, value);
  });

  it("キャッシュput&get(string).", async () => {
    const key = "FileCache_putget_string";
    const value = "wao!!";
    await testPutAndTest(key, value);
  });

  it("キャッシュput&get(array).", async () => {
    const key = "FileCache_putget_array";
    const value = ["wao!!", 1234];
    await testPutAndTest(key, value);
  });

  it("キャッシュput&get(null).", async () => {
    const key = "FileCache_putget_null";
    const value = null;
    await testPutAndTest(key, value);
  });

  it("キャッシュput&get(undefined).", async () => {
    const key = "FileCache_putget_undefined";
    const value = undefined;
    await testPutAndTest(key, value);
  });

  it("キャッシュput&get(expired).", async () => {
    const key = "FileCache_putget_expired";
    const value = "expired";
    const cache = new FileCache({ ttlMs: 100 });
    await cache.put(key, value);
    await sleepAsync(150);
    expect.assertions(2);
    expect(await cache.get(key)).toBeUndefined();
    const cacheDir = cache.getConfig().cacheDir;
    expect(fs.existsSync(path.join(cacheDir, key))).toBeFalsy();
  });


});
