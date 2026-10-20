import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileCache, type Config } from '../src/index.ts';
import { sleepAsync } from '../src/lib/FileCache.ts';

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(async () => {
  vi.restoreAllMocks();
  const cache = new FileCache();
  await cache.purge({ force: true })
});

describe('FileCache', () => {

  function getCacheFilePath(key: string) {
    return path.join(process.cwd(), '.cache', `${key}.json`);
  }

  /**
   * Success Test for `set` and `get`.
   * @param key 
   * @param value 
   */
  async function testSetGetTest(key: string, value: unknown, options?: Config) {
    const cache = new FileCache(options);
    await cache.set(key, value);
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

  it("Cache set & get (object).", async () => {
    const key = "FileCache_setget_object";
    const value = { test: 1, hoge: "hello" };
    await testSetGetTest(key, value);
  });

  it("Cache set & get (number).", async () => {
    const key = "FileCache_setget_number";
    const value = 1009;
    await testSetGetTest(key, value);
  });

  it("Cache set & get (boolean).", async () => {
    const key = "FileCache_setget_boolean";
    const value = true;
    await testSetGetTest(key, value);
  });

  it("Cache set & get (string).", async () => {
    const key = "FileCache_setget_string";
    const value = "wao!!";
    await testSetGetTest(key, value);
  });

  it("Cache set & get (array).", async () => {
    const key = "FileCache_setget_array";
    const value = ["wao!!", 1234];
    await testSetGetTest(key, value);
  });

  it("Cache set & get (null).", async () => {
    const key = "FileCache_setget_null";
    const value = null;
    await testSetGetTest(key, value);
  });

  it("Cache set & get (undefined).", async () => {
    const key = "FileCache_setget_undefined";
    const value = undefined;
    await testSetGetTest(key, value);
  });

  it("Cache set & get (expired).", async () => {
    const key = "FileCache_setget_expired";
    const value = "expired";
    const cache = new FileCache({ ttlMs: 100 });
    await cache.set(key, value);
    await sleepAsync(150);
    expect.assertions(2);
    // Cannot be retrieved because it has expired.
    expect(await cache.get(key)).toBeUndefined();
    expect(fs.existsSync(getCacheFilePath(key))).toBeFalsy();
  });

  it("Cache set & get  withoutLock.", async () => {
      const key = "FileCache_setget_withoutLock";
      const value = { test: 1, hoge: "hello" };
      await testSetGetTest(key, value, { withLock: false });
  });

  it("getAll()", async () => {
    const key = "testGetAll";
    const value = "testGetAll";
    const cache = new FileCache({ ttlMs: 0 });
    await cache.set(key, value);
    const all = await cache.getAll();
    expect(all).not.toBeUndefined();
    expect(Object.keys(all).length).toBeGreaterThanOrEqual(1);
    expect(all[key]).toBe(value);
  });


  it("Expired cache entries are removed by purge().", async () => {
    const key = "FileCache_purge_no_expire";
    const key2 = "FileCache_purge_short_expire";
    const value = "no expiration";
    const value2 = "_200 expiration";
    const cache = new FileCache({ ttlMs: 0 });
    await cache.set(key, value);
    await cache.set(key2, value2, { ttlMs: 400 });
    await cache.purge();
    expect(await cache.get(key)).toBe(value);
    expect(await cache.get(key2)).toBe(value2);
    await sleepAsync(410);
    expect(await cache.get(key)).toBe(value);
    expect(await cache.get(key2)).toBeUndefined();
  });

  it("`purge({ force: true })` deletes all caches.", async () => {
    const key = "FileCache_purge_no_expire";
    const key2 = "FileCache_purge_short_expire";
    const key3 = "FileCache_purge_undefined";
    const value = "no expiration";
    const value2 = "_200 expiration";
    const value3 = undefined;
    const cache = new FileCache({ ttlMs: 0 });
    await cache.set(key, value);
    await cache.set(key2, value2, { ttlMs: 400 });
    await cache.set(key3, value3);
    await cache.purge({ force: true });
    expect(await cache.get(key)).toBeUndefined();
    expect(await cache.get(key2)).toBeUndefined();
    expect(await cache.get(key3)).toBeUndefined();
    expect(Object.keys(await cache.getAll()).length).toBe(0);
    // Verify that the specified file has been properly deleted.
    // This check is necessary because a bug related to this occurred in the past.)
    expect(fs.existsSync(getCacheFilePath(key3))).toBeFalsy();
  });

  it("Include invalid characters for keys when performing set and get operations.", async () => {
    const key = 'FileCache_\\set""get_special:Key';
    const value = "Include invalid characters for keys when performing set and get operations.";
    await testSetGetTest(key, value);
  })

  it("purgeProbability: 1.0", async () => {
    const key = 'FileCache_purgeProbability1.0';
    const cachePath = getCacheFilePath(key);
    const key2 = 'FileCache_purgeProbability1.0_2';
    const value = "purgeProbability: 1.0";
    const cache = new FileCache({ purgeProbability: 1.0 });
    const data = { value: 1234, expiresAt: Date.now() - 1000 }

    // Fifty tests should be enough.
    for(let i = 0; i < 50; i++) {
      fs.writeFileSync(cachePath, JSON.stringify(data, null, '  '));
      await cache.set(key2, value);
      expect(fs.existsSync(cachePath)).toBeFalsy();
    }

  })
  
});
