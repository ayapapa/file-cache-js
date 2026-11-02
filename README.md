[![CI](https://github.com/ayapapa/file-cache-js/actions/workflows/ci.yml/badge.svg)](https://github.com/ayapapa/file-cache-js/actions/workflows/ci.yml)
![Coverage](https://raw.githubusercontent.com/ayapapa/file-cache-js/main/badges/coverage-total.svg)
![Branches](https://raw.githubusercontent.com/ayapapa/file-cache-js/main/badges/coverage-branches.svg)
![Functions](https://raw.githubusercontent.com/ayapapa/file-cache-js/main/badges/coverage-functions.svg)
![Lines](https://raw.githubusercontent.com/ayapapa/file-cache-js/main/badges/coverage-lines.svg)
![Statements](https://raw.githubusercontent.com/ayapapa/file-cache-js/main/badges/coverage-statements.svg)

# file-cache-js

## Table of contents
[Overview](#overview) | [Definitions of Terms](#definitions-of-terms) | [Features](#features) | [Installation](#installation) | [API Reference](#api-reference) | [Usage](#usage) | [Configurations](#configurations) | [Errors](#errors)

## Overview

A lightweight file-based JSON cache with TTL and cross-process locking.

Inspired by existing file-based cache implementations for Node.js, this utility was developed to provide features such as cache lifetime (TTL) management and sharing across multiple processes.

It enables exclusive read and write access to cache data that can be shared among multiple processes.
Consequently, it allows for tasks such as temporarily caching the results of requests to a specific service—thereby reducing the frequency of such requests—while ensuring that the cached data can be safely shared across multiple processes.

## Definitions of Terms
|        Term     |  Explanation  |  See also  |
| --------------- | ------------- | -------------|
| `cache key`        | A key used to apply a cache. When multiple operations use the same key, they are executed sequentially. If the specified `cache key` contains characters that are invalid for a file path, it is converted into a valid file path by replacing those characters with underscores and removing double quotation marks. | `cache file` | 
| `cache directory`  | A directory where `cache file`s are stored. | `cache file`, [Configurations](#configurations) |
| `cache file`       | It is associated with the specified `cache key` and stores `cache value` and the actual expiration time. <br>For example, if the `cache key` is "key001", a file named "key001.json" is created under the `cache directory` and deleted when the cache is expired. | `cache key`, `cache directory`
| `cache value`      | It is a user-specified value that is associated with a ‘cache key’ and stored in a ‘cache file’. The value must be of a type that can be converted to JSON. Types such as `Map`, `Set`, `Symbol`, `BigInt`, or `Function` cannot be converted correctly—they may be ignored, converted to `null` or an empty object, or result in an error. If you wish to cache these values, please convert them into a format that can be serialized to JSON before the caching process. | `cache key`, `cache file`

## Features

- Lightweight (package size of approximately 10 KB).
- Easy to use; basic operations consist of `set` and `get`.
- Associates keys with values ​​and stores them in files.
- Uses the JSON file format, saving data as `key.json` files within a specified directory.
- Each file contains the "value" and an "expiration time" for the cached data.
- Storing data in files enables sharing across different processes.
- Employs file locking (via an external library) to manage exclusive access and prevent file I/O conflicts between processes.
- Includes resilience against corrupted or invalid files (with options to detect and report errors, or to automatically delete such files based on configuration during initialization).
- Features a retry mechanism for file I/O errors (with configurable retry counts and intervals).

## Installation
```bash
npm install @ayapapa-npm/file-cache-js
```

## API Reference
[API document](https://github.com/ayapapa/file-cache-js/blob/main/docs/api.md)

## Usage
  ```ts
  const key = "hoge";
  const value = { hoge: "hoge" };
  const cache = new FileCache();
  await cache.set(key, value);
  const res = await cache.get(key);
  console.log(res); // { hoge: 'hoge' }
  ```
  ** Don't forget `await`! **

## Configurations
| Name | Type | Default and Min | Description | Notes |
|---|---|---:|---|---|
| `cacheDirectory` | `string` | `${process.cwd()}/.cache` N/A | Directory used to store `cache file`s. | Set to `false` to disable caching. |
| `ttlMs` | `number` | `600000` `0` | Cache expiration time in milliseconds. | If a value of `0` or less is specified, there is no expiration. |
| `withLock` | `boolean` | `true` N/A | Specifies whether to apply exclusive control to cache file I/O operations. |  |
| `lockDirectory` | `string` | `${process.cwd()}/.lock` N/A | Directory used to store lock information. |  |
| `lockTimeoutMs` | `number` | `1000` `0` | Maximum time to wait for acquiring the lock, in milliseconds. | Cannot be used with `timeoutSec`. `0` means no waiting. Values below `0` are treated as `0`. |
| `lockttlMs` | `number` | `1000` `1000` | Lock time to live in milliseconds. | Values below `1000` are treated as `1000`. |
| `purgeProbability` | `number` | `0.1` `0` | The probability (rate) at which old cache entries are removed. | The maximum is `1.0`. |
| `retriesOnIoErr` | `number` | `1` `0` | Number of retries for `cache file` operations after I/O errors. | Values below `0` are treated as `0`. |
| `retryIoIntervalMs` | `number` | `100` `100` | Retry interval in milliseconds after I/O errors. | Values below `100` are treated as `100`. |
| `removeInvalid` | `boolean` | `false` N/A | Specifies whether to remove invalid `cache file`s. | Note: Ensure that there is no impact on other processes before proceeding. |
| `invalidTtlMs` | `number` | `600000` `0` | Validity period in milliseconds for the modification time of invalid `cache file`. | If `removeInvalid` is true and the specified amount of time has elapsed since the modification time of an invalid `cache file`, it is forcibly removed.  |


## Errors
| Class name | Overview | Message | Other key properties | Recommended action |
|---|---|---|---|---|
| `InvalidCache` | Invalid cache information. | Found an invalid cache file. | `{ code: "EINVALIDCACHE" }` | Identify the source of the invalid cache and delete the affected cache file. |
| `FileCacheError` | A file cache operation failed. | Invalid `cache key`. | `{ code: "EINVAL" }` | Specify valid `cache key`. |
| `FileCacheError` | A file cache operation failed. | Failed to acquire the lock. | `{ code: "ELOCK" }` | Increase the value of `lockTimeoutMs`. |
| `FileCacheError` | A file cache operation failed. | Failed to create the cache data storage directory. | `{ code: "ECREATECACHEDIR" }` | Specify valid `cache directory`. |
