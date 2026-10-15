import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FileCache, { FileCacheError } from '../src/index.ts';
//import { FileCache, /*type Config as FileCacheConfig*/ } from '../src/index.ts';
//import { FileCacheError, sleepAsync } from '../src/lib/FileCache.ts';

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FileCache', () => {

  function getCacheFilePath(key: string) {
    return path.join(process.cwd(), '.cache', `${key}.json`);
  }
  
  async function testInvalid(key: string, data: Record<string, unknown> | string, error: Record<string, unknown>, success?: (result: unknown) => void) {
    const cache = new FileCache();
    const path = getCacheFilePath(key);
    fs.writeFileSync(path, typeof data === 'string' ? data : JSON.stringify(data, null, '  '));
    try {
      const res = await cache.get(key);
      if (success) success(res);
    }
    catch (err) {
      expect(err).instanceOf(FileCacheError);
      expect(err).toMatchObject(error);
    }
  }

  // 不正キャッシュファイル発見時
  // invaldTtlMs登場ですかなぁ。。。。
  it("不正なキャッシュファイル(valueが無い)", async () => {
    // valueが無いのは、undefinedということなので、エラーではない。
    const key = 'invalidNoValue';
    await testInvalid(key, {
      "expiration": Date.now() - 100
    },
    {},
    r => expect(r).toBeUndefined());
  });

  it("不正なキャッシュファイル(expirationが無い)", async () => {
    const key = 'invalidNoExpiration';
    await testInvalid(key, {
      "expiration": Date.now() - 100
    },
    {
      code: 'EINVALIDCACHE',
      message: "Found an invalid `cache file`.",
      key
    });
  });

  it("不正なキャッシュファイル(空ファイル)", async () => {
    const key = 'invalidJson';
    await testInvalid(key, "", {
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

  });

  // File IO(read, write, readdir, unlink)エラーテスト
  it("readFileSyncエラー", async () => {

  });

  it("writeSyncエラー", async () => {

  });

  it("unlinkSyncエラー", async () => {

  });

  it("readirSyncエラー", async () => {

  });

  // ロックエラー
  it("ロックエラー", async () => {
    // 故意にファイルを作り、エラーを誘う（tmpファイルでいいかも
  });

});
