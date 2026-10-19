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

  it("初期設定", () => {
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

  it("Min設定", () => {
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

  function testInvalidConf(name: string, value: unknown, code = 'EINVAL'/*exptected?: unknown*/) {
    const defaultConf = FileCache.getDefaultConf() as Record<string, unknown>;
    const conf: Record<string, unknown> = {};
    conf[name] = value;
    if (value == null) expect.assertions(1);
    else expect.assertions(2)
    try {
      const cache = new FileCache(conf);
      const curConf = cache.getConfig() as Record<string, unknown>;
      expect(curConf[name]).toBe(/*exptected ?? */defaultConf[name])
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


  it("null removeInvalid", () => {
    testInvalidConf("removeInvalid", null);
  });

  it("undefined invalidTtlMs", () => {
    testInvalidConf("invalidTtlMs", undefined);
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

  it("キャッシュディレクトリを指定する（成功編）", () => {
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

  it("キャッシュディレクトリを指定する（失敗(dirではなかった）編->process.cwd()ベースのディレクトリが選ばれる）", () => {
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

   // キャッシュディレクトリがファイルだったら？
  it("デフォルトキャッシュディレクトリがファイルだったら", () => {
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
        message: "キャッシュデータ格納ディレクトリの作成に失敗しました。",
      });
    }
    finally {
      fs.unlinkSync(dir);
      fs.renameSync(dirBu, dir);
    }
  });



  // ★★★ファイルキャッシュ数の最大値のテスト-1, 0, 1 （ちなみに、Infiniteや、NaNってテストすべき？？）
  // ちなみに、自分の実用範囲でいうと、、、今、おおよそ１００個が通常運用数　⇒　500くらいをデフォルトMAXにしておきますか？それとも、Infinityにしておきますか？？
  const n: number = NaN;
  const i: number = Infinity;
  console.log("NaN is ", typeof n); 
  console.log("Infinity is ", typeof i); 
  // number....  つまり、NaNやInfiniteもちゃんとテストしないとね！！！　★★　最初のころの型チェックテストあたりでどうかな？？
  // ちなみに、Number.isFinite(n)は、型チェックでしくれて、かつ、NaNやInfiniteもfalseにしてくれるの便利！！！
  // ★★★以下の結果を参考に！！！！
  console.log(Math.max(n, 9999999)); // NaN
  console.log(Math.max(i, 9999999)); // Infinity
  console.log(Math.min(n, 9999999)); // NaN
  console.log(Math.min(i, 9999999)); // 9999999

  // 次も参考に！！
  console.log("Number.isInfinity(...)");
  console.log("NaN", Number.isFinite(NaN));               // false
  console.log("Infinity", Number.isFinite(Infinity));               // false
  console.log("123", Number.isFinite(123));               // true
  console.log("3.14", Number.isFinite(3.14));               // true
  console.log('"123"', Number.isFinite("123"));               // false
  console.log("9007199254740991", Number.isFinite(9007199254740991));               // true
  console.log("9007199254740992", Number.isFinite(9007199254740992));               // true
  //console.log("9007199254740993", Number.isFinite(9007199254740993));               // true

  let hoge = 9007199254740991;
  for (let i = 0; i <10; ++i, ++hoge)
    console.log("hoge", hoge); // 9007199254740992を超える値にはならない！！

  console.log("Number.isSafeInteger(...)");
  console.log("NaN", Number.isSafeInteger(NaN));               // false
  console.log("Infinity", Number.isSafeInteger(Infinity));               // false
  console.log("123", Number.isSafeInteger(123));               // true
  console.log("3.14", Number.isSafeInteger(3.14));               // false
  console.log('"123"', Number.isSafeInteger("123"));               // false
  console.log("9007199254740991", Number.isSafeInteger(9007199254740991));               // true
  console.log("9007199254740992", Number.isSafeInteger(9007199254740992));               // false
});
