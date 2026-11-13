//import fs, { rmSync } from 'node:fs';
//import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileCache, /*type Config*/ } from '../src/index.ts';
import { sleepAsync } from '../src/lib/FileCache.ts';
//import { getCacheDirPath, getCacheFilePath } from './TestCommon.ts';

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(async () => {
  vi.restoreAllMocks();
  const cache = new FileCache();
  await cache.purge({ force: true })
});

let NumberOfTimes = 500;

describe('FileCache stress test', () => {

  it(`${NumberOfTimes} async set, same key, same instance.`, async () => {
    const NumberOfTimes = 500;
    const prs = [] as Promise<void>[];
    const key = "100 async set, same key, same instance";
    const cache = new FileCache();//{ _debug: true });
    for (let i = 0; i < NumberOfTimes; i++) {
      prs.push(cache.set(key, i));
    }
    const results = await Promise.allSettled(prs);
    expect(results.every(r => r.status === 'fulfilled')).toBeTruthy();
  });

  NumberOfTimes = 500;
  it(`${NumberOfTimes} async set, same key, different instances.`, async () => {
    const NumberOfTimes = 500;
    const prs = [] as Promise<void>[];
    const key = "100 async set, same key, different instances";
    //const cache = new FileCache();
    for (let i = 0; i < NumberOfTimes; i++) {
      // A:
      prs.push((new FileCache( {
        lockTimeoutMs: 10000,
        lockTtlMs: 10000
      })).set(key, i));
      await sleepAsync(0);
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
    let success = 0, errors = 0, ttlExceeded = 0, alreadyLocked = 0;
    results.forEach((r) => {
      if (r.status === 'fulfilled') {
        expect(r.value).toBeUndefined()
        success++;
      }
      else {
        errors++;
        expect(r.reason.cause).toBeDefined();
        if (r.reason.cause?.code === 'ETTLEXCEEDED') 
          ttlExceeded++;
        else if (r.reason.cause?.code === 'EALREADYLOCKED') 
          alreadyLocked++;
      }
    });
    expect(success + errors).toBe(NumberOfTimes);
    expect(alreadyLocked + ttlExceeded).toBe(errors);
    console.log("success =", success, "errors =", errors, `(EALREADYLOCKED = ${alreadyLocked}, ETTLEXCEEDED = ${ttlExceeded}, other = ${errors - alreadyLocked - ttlExceeded})`);
  });
return;
  it(`${NumberOfTimes} async get, same key, same instance.`, async () => {
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

});
