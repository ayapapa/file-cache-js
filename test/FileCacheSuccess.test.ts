import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileCache, type Config } from '../src/index.ts';
import { sleepAsync } from '../src/lib/FileCache.ts';

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FileCache', () => {

  /**
   * Success Test for `put` and `get`.
   * @param key 
   * @param value 
   */
  async function testPutGetTest(key: string, value: unknown, options?: Config) {
    const cache = new FileCache(options);
    await cache.put(key, value);
    const lockDir = path.join(process.cwd(), '.lock');
    const statBefor = fs.statSync(lockDir);
    expect.assertions(2);
    try {
      if (value == null || typeof value === "number" || typeof value === "string")
        expect(await cache.get(key)).toBe(value);
      else
        expect(await cache.get(key)).toMatchObject(value);
    }
    catch (err) {
      console.log(err);
    }
    const statAfter = fs.statSync(lockDir);
    if (cache.getConfig().withLock)
      expect(statBefor.mtimeMs).lessThan(statAfter.mtimeMs);
    else 
      expect(statBefor.mtimeMs).toBe(statAfter.mtimeMs);
  }

  it("キャッシュput&get(object).", async () => {
    const key = "FileCache_putget_object";
    const value = { test: 1, hoge: "hello" };
    await testPutGetTest(key, value);
  });

  it("キャッシュput&get(number).", async () => {
    const key = "FileCache_putget_number";
    const value = 1009;
    await testPutGetTest(key, value);
  });

  it("キャッシュput&get(boolean).", async () => {
    const key = "FileCache_putget_boolean";
    const value = true;
    await testPutGetTest(key, value);
  });

  it("キャッシュput&get(string).", async () => {
    const key = "FileCache_putget_string";
    const value = "wao!!";
    await testPutGetTest(key, value);
  });

  it("キャッシュput&get(array).", async () => {
    const key = "FileCache_putget_array";
    const value = ["wao!!", 1234];
    await testPutGetTest(key, value);
  });

  it("キャッシュput&get(null).", async () => {
    const key = "FileCache_putget_null";
    const value = null;
    await testPutGetTest(key, value);
  });

  it("キャッシュput&get(undefined).", async () => {
    const key = "FileCache_putget_undefined";
    const value = undefined;
    await testPutGetTest(key, value);
  });

  it("キャッシュput&get(expired).", async () => {
    const key = "FileCache_putget_expired";
    const value = "expired";
    const cache = new FileCache({ ttlMs: 100 });
    await cache.put(key, value);
    await sleepAsync(150);
    expect.assertions(2);
    // 期限切れのため取得できない
    expect(await cache.get(key)).toBeUndefined();
    const cacheDir = cache.getConfig().cacheDir;
    expect(fs.existsSync(path.join(cacheDir, key))).toBeFalsy();
  });

  it("purge()で、期限切れのキャッシュは削除される。", async () => {
    const key = "FileCache_purge_no_expire";
    const key2 = "FileCache_purge_short_expire";
    const value = "no expiration";
    const value2 = "_200 expiration";
    const cache = new FileCache({ ttlMs: 0 });
    await cache.put(key, value);
    await cache.put(key2, value2, { ttlMs: 400 });
    await cache.purge();
    expect(await cache.get(key)).toBe(value);
    expect(await cache.get(key2)).toBe(value2);
    await sleepAsync(410);
    expect(await cache.get(key)).toBe(value);
    expect(await cache.get(key2)).toBeUndefined();
  });

  it("purge({ force: true })で、全てのキャッシュが削除される。", async () => {
    const key = "FileCache_purge_no_expire";
    const key2 = "FileCache_purge_short_expire";
    const value = "no expiration";
    const value2 = "_200 expiration";
    const cache = new FileCache({ ttlMs: 0 });
    await cache.put(key, value);
    await cache.put(key2, value2, { ttlMs: 400 });
    await cache.purge({ force: true });
    expect(await cache.get(key)).toBeUndefined();
    expect(await cache.get(key2)).toBeUndefined();
  });

    it("キャッシュput&get withoutLock.", async () => {
      const key = "FileCache_putget_object";
      const value = { test: 1, hoge: "hello" };
      await testPutGetTest(key, value, { withLock: false });
  });


});
