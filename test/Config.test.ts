import path from 'node:path';
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileCache, FileCacheError, type Config } from '../src/index.ts';

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(async () => {
  vi.restoreAllMocks();
  const cache = new FileCache();
  await cache.purge({ force: true })
});

describe('FileCache', () => {

  it("Initial settings.", () => {
    const cache = new FileCache();
    expect(cache.getConfig()).toMatchObject({
      ttlMs:              10 * 60 * 1000,
      retriesOnIoErr:     1,
      retryIoIntervalMs:  100,
      cacheDir:           path.join(process.cwd(), '.cache'),
      withLock:           true,
      lockTimeoutMs:      1000,
      lockTtlMs:          1000,
      purgeProbability:   0.1
    })
  });

  it("Min setting.", () => {
    const cache = new FileCache({
      ttlMs:              -999,
      retriesOnIoErr:     -555,
      retryIoIntervalMs:  -1,
      lockTimeoutMs:      -99,
      lockTtlMs:          -100,
      purgeProbability:   -0.2,
      invalidTtlMs:       -999,
    });
    expect(cache.getConfig()).toMatchObject({
      ttlMs:              0,
      retriesOnIoErr:     0,
      retryIoIntervalMs:  100,
      lockTimeoutMs:      0,
      lockTtlMs:          1000,
      purgeProbability:   0,
      invalidTtlMs:       0
    })
  });

  /**
   * Invalid configuration test.
   * @param name 
   * @param value 
   * @param code 
   */
  function testInvalidConf(name: string, value: unknown, code = 'EINVAL'/*exptected?: unknown*/) {
    const defaultConf = FileCache.getDefaultConf() as Record<string, unknown>;
    const conf: Record<string, unknown> = {};
    conf[name] = value;
    if (value == null) expect.assertions(1);
    else expect.assertions(2)
    try {
      const cache = new FileCache(conf);
      const curConf = cache.getConfig() as Record<string, unknown>;
      expect(curConf[name]).toBe(defaultConf[name])
    }
    catch (err) {
      expect(err).instanceOf(FileCacheError);
      expect(err).toMatchObject({
        code,
        message: `[REQUIRE] Invalid ${name}.`
      });
    }
  }

  it("null ttlMs", () => {
    testInvalidConf("ttlMs", null);
  });

  it("NaN ttlMs", () => {
    testInvalidConf("ttlMs", NaN, 'EOUTRANGE');
  });

  it("Infinity ttlMs", () => {
    testInvalidConf("ttlMs", Infinity, 'EOUTRANGE');
  });

  it("undefined ttlMs", () => {
    testInvalidConf("ttlMs", undefined);
  });

  it("boolean ttlMs", () => {
    testInvalidConf("ttlMs", true);
  });

  it("string ttlMs", () => {
    testInvalidConf("ttlMs", "string");
  });

  it("object ttlMs", () => {
    testInvalidConf("ttlMs", { hoge: 123 });
  });

  it("array ttlMs", () => {
    testInvalidConf("ttlMs", [ 0, 1, "eee" ]);
  });


  it("null retriesOnIoErr", () => {
    testInvalidConf("retriesOnIoErr", null);
  });

  it("undefined retriesOnIoErr", () => {
    testInvalidConf("retriesOnIoErr", undefined);
  });

  it("NaN retriesOnIoErr", () => {
    testInvalidConf("retriesOnIoErr", NaN, 'EOUTRANGE');
  });

  it("Infinity retriesOnIoErr", () => {
    testInvalidConf("retriesOnIoErr", Infinity, 'EOUTRANGE');
  });

  it("boolean retriesOnIoErr", () => {
    testInvalidConf("retriesOnIoErr", false);
  });

  it("string retriesOnIoErr", () => {
    testInvalidConf("retriesOnIoErr", "string");
  });

  it("object retriesOnIoErr", () => {
    testInvalidConf("retriesOnIoErr", { hoge: 123 });
  });

  it("array retriesOnIoErr", () => {
    testInvalidConf("retriesOnIoErr", [ 0, 1, "eee" ]);
  });
  

  it("null retryIoIntervalMs", () => {
    testInvalidConf("retryIoIntervalMs", null);
  });

  it("undefined retryIoIntervalMs", () => {
    testInvalidConf("retryIoIntervalMs", undefined);
  });

  it("boolean retryIoIntervalMs", () => {
    testInvalidConf("retryIoIntervalMs", true);
  });

  it("string retryIoIntervalMs", () => {
    testInvalidConf("retryIoIntervalMs", "string");
  });

  it("object retryIoIntervalMs", () => {
    testInvalidConf("retryIoIntervalMs", { hoge: 123 });
  });

  it("array retryIoIntervalMs", () => {
    testInvalidConf("retryIoIntervalMs", [ 0, 1, "eee" ]);
  });


  it("null cacheDir", () => {
    testInvalidConf("cacheDir", null);
  });

  it("undefined cacheDir", () => {
    testInvalidConf("cacheDir", undefined);
  });

  it("number cacheDir", () => {
    testInvalidConf("cacheDir", 1234);
  });

  it("boolean cacheDir", () => {
    testInvalidConf("cacheDir", false);
  });

  it("object cacheDir", () => {
    testInvalidConf("cacheDir", { hoge: 123 });
  });

  it("array cacheDir", () => {
    testInvalidConf("cacheDir", [ 0, 1, "eee" ]);
  });


  it("null withLock", () => {
    testInvalidConf("withLock", null);
  });

  it("undefined withLock", () => {
    testInvalidConf("withLock", undefined);
  });

  it("number withLock", () => {
    testInvalidConf("withLock", 1234);
  });

  it("string withLock", () => {
    testInvalidConf("withLock", "hogehogege");
  });

  it("object withLock", () => {
    testInvalidConf("withLock", { hoge: 123 });
  });

  it("array withLock", () => {
    testInvalidConf("withLock", [ 0, 1, "eee" ]);
  });

  
  it("null lockTimeoutMs", () => {
    testInvalidConf("lockTimeoutMs", null);
  });

  it("undefined lockTimeoutMs", () => {
    testInvalidConf("lockTimeoutMs", undefined);
  });

  it("string lockTimeoutMs", () => {
    testInvalidConf("lockTimeoutMs", "hello");
  });

  it("boolean lockTimeoutMs", () => {
    testInvalidConf("lockTimeoutMs", true);
  });

  it("object lockTimeoutMs", () => {
    testInvalidConf("lockTimeoutMs", { hoge: 123 });
  });

  it("array lockTimeoutMs", () => {
    testInvalidConf("lockTimeoutMs", [ 0, 1, "eee" ]);
  });
  

  it("null lockTtlMs", () => {
    testInvalidConf("lockTtlMs", null);
  });

  it("undefined lockTtlMs", () => {
    testInvalidConf("lockTtlMs", undefined);
  });

  it("string lockTtlMs", () => {
    testInvalidConf("lockTtlMs", "hello");
  });

  it("boolean lockTtlMs", () => {
    testInvalidConf("lockTtlMs", true);
  });

  it("object lockTtlMs", () => {
    testInvalidConf("lockTtlMs", { hoge: 123 });
  });

  it("array lockTtlMs", () => {
    testInvalidConf("lockTtlMs", [ 0, 1, "eee" ]);
  });

  
  it("null purgeProbability", () => {
    testInvalidConf("purgeProbability", null);
  });

  it("undefined purgeProbability", () => {
    testInvalidConf("purgeProbability", undefined);
  });

  it("NaN purgeProbability", () => {
    testInvalidConf("purgeProbability", NaN, 'EOUTRANGE');
  });

  it("Infinity purgeProbability", () => {
    testInvalidConf("purgeProbability", Infinity, 'EOUTRANGE');
  });

  it("string purgeProbability", () => {
    testInvalidConf("purgeProbability", "hello");
  });

  it("boolean purgeProbability", () => {
    testInvalidConf("purgeProbability", true);
  });

  it("object purgeProbability", () => {
    testInvalidConf("purgeProbability", { hoge: 123 });
  });

  it("array purgeProbability", () => {
    testInvalidConf("purgeProbability", [ 0, 1, "eee" ]);
  });
  

  it("null removeInvalid", () => {
    testInvalidConf("removeInvalid", null);
  });

  it("undefined removeInvalid", () => {
    testInvalidConf("removeInvalid", undefined);
  });

  it("string removeInvalid", () => {
    testInvalidConf("removeInvalid", "hello");
  });

  it("number removeInvalid", () => {
    testInvalidConf("removeInvalid", 9099);
  });

  it("object removeInvalid", () => {
    testInvalidConf("removeInvalid", { hoge: 123 });
  });

  it("array removeInvalid", () => {
    testInvalidConf("removeInvalid", [ 0, 1, "eee" ]);
  });


  it("null invalidTtlMs", () => {
    testInvalidConf("invalidTtlMs", null);
  });

  it("undefined invalidTtlMs", () => {
    testInvalidConf("invalidTtlMs", undefined);
  });

  it("NaN invalidTtlMs", () => {
    testInvalidConf("invalidTtlMs", NaN, 'EOUTRANGE');
  });

  it("Infinity invalidTtlMs", () => {
    testInvalidConf("invalidTtlMs", Infinity, 'EOUTRANGE');
  });

  it("string invalidTtlMs", () => {
    testInvalidConf("invalidTtlMs", "hello");
  });

  it("boolean invalidTtlMs", () => {
    testInvalidConf("invalidTtlMs", true);
  });

  it("object invalidTtlMs", () => {
    testInvalidConf("invalidTtlMs", { hoge: 123 });
  });

  it("array invalidTtlMs", () => {
    testInvalidConf("invalidTtlMs", [ 0, 1, "eee" ]);
  });

  it("Specifying a cache directory (successful case).", () => {
    const cacheDir = path.join(process.cwd(), '.cache', 'test');
    const config: Config = { cacheDir };
    try {
      new FileCache(config);
      expect(fs.existsSync(cacheDir)).toBeTruthy();
    }
    finally {
      fs.rmSync(cacheDir, { recursive: true });
    }
  });

  it("Specifying a cache directory (failed case).", () => {
    const cacheDir = path.join(process.cwd(), '.cache', 'test2');
    fs.writeFileSync(cacheDir, "");
    const config: Config = { cacheDir };
    expect.assertions(2);
    try {
      const cache = new FileCache(config);
      expect(fs.existsSync(cacheDir)).toBeTruthy();
      expect(cache.getConfig().cacheDir).toBe(path.join(process.cwd(), '.cache'));
    }
    finally {
      fs.rmSync(cacheDir, { recursive: true });
    }
  });

  it("If the default cache directory is a file.", () => {
    const dir = path.join(process.cwd(), '.cache');
    const dirBu = path.join(process.cwd(), '.cache.bu');
    fs.renameSync(dir, dirBu);
    fs.writeFileSync(dir, "");
    expect.assertions(2);
    try {
      new FileCache({ cacheDir: undefined } as unknown as Config);
    }
    catch (err) {
      expect(err).instanceOf(FileCacheError);
      expect(err).toMatchObject({
        code: "ECREATECACHEDIR",
        message: "Failed to create the cache data storage directory.",
      });
    }
    finally {
      fs.unlinkSync(dir);
      fs.renameSync(dirBu, dir);
    }
  });

});
