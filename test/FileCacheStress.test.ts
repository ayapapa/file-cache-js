//import fs, { rmSync } from 'node:fs';
//import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileCache, /*type Config*/ } from '../src/index.ts';
//import { sleepAsync } from '../src/lib/FileCache.ts';
//import { getCacheDirPath, getCacheFilePath } from './TestCommon.ts';

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(async () => {
  vi.restoreAllMocks();
  const cache = new FileCache();
  await cache.purge({ force: true })
});

describe('FileCache stress test', () => {

  it("500 async set, same key, same instance.", async () => {
    const NumberOfTimes = 500;
    const prs = [] as Promise<void>[];
    const key = "100 async set, same key, same instance";
    const cache = new FileCache();
    for (let i = 0; i < NumberOfTimes; i++) {
      prs.push(cache.set(key, i));
    }
    const results = await Promise.allSettled(prs);
    expect(results.every(r => r.status === 'fulfilled')).toBeTruthy();
  });

return;

it("500 async set, same key, different instances.", async () => {
    const NumberOfTimes = 100;
    const prs = [] as Promise<void>[];
    const key = "100 async set, same key, different instances";
    //const cache = new FileCache();
    for (let i = 0; i < NumberOfTimes; i++) {
      // A:
      prs.push((new FileCache( {
        lockTimeoutMs: 10000,
        lockTtlMs: 10000
      })).set(key, i));
      //await sleepAsync(0);
      //await Promise.resolve();
      
      // B:
      /*
       const cache = new FileCache();
      prs.push(
        Promise.resolve().then(() => cache.set(key, i))
      );
      */
      // C:
      /*
      prs.push(
        new Promise<void>((resolve, reject) => {
          setImmediate(() => {
            (new FileCache()).set(key, i).then(resolve, reject);
          });
        })
      );*/

      //await sleepAsync(0);
      // C+
      /*prs.push(
        new Promise<void>((resolve, reject) => {
          setImmediate(() => {
            (async () => {
              await sleepAsync(1);
              await (new FileCache()).set(key, i);
            })().then(resolve, reject);
          });
        })
      );
      */      
    }
    const results = await Promise.allSettled(prs);
    //expect(results.every(r => r.status === 'fulfilled')).toBeTruthy();
    let success = 0, errors = 0;
    results.forEach(r => {
      if (r.status === 'fulfilled') {
        success++;
      }
      else {
        errors++;
      }
    });
    console.log("success =", success, "errors =", errors);
  });
return;
  it("500 async get, same key, same instance.", async () => {
    const NumberOfTimes = 500;
    const prs = [] as Promise<unknown>[];
    const key = "100 async set, same key, same instance";
    const cache = new FileCache();
    for (let i = 0; i < NumberOfTimes; i++) {
      prs.push(cache.get(key));
    }
    const results = await Promise.allSettled(prs);
    expect(results.every(r => r.status === 'fulfilled')).toBeTruthy();
  });
  /*
  it("500 async set, different keys, same instance.", async () => {
    const NumberOfTimes = 500;
    const prs = [] as Promise<void>[];
    const key = "100 async set, same key, same instance";
    const cache = new FileCache();
    for (let i = 0; i < NumberOfTimes; i++) {
      prs.push(cache.set(key, i));
    }
    const results = await Promise.allSettled(prs);
    expect(results.every(r => r.status === 'fulfilled')).toBeTruthy();
  });
*/
});
