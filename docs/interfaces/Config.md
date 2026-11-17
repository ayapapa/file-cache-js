[**@ayapapa-npm/file-cache-js**](../api.md)

***

[@ayapapa-npm/file-cache-js](../api.md) / Config

# Interface: Config

Defined in: [src/lib/FileCache.ts:20](https://github.com/ayapapa/file-cache-js/blob/bc4b4d41a1bd58a211da9bc4ce76a4a3b40c9021/src/lib/FileCache.ts#L20)

Configurations.

## Properties

### \_debug?

> `optional` **\_debug?**: `boolean`

Defined in: [src/lib/FileCache.ts:113](https://github.com/ayapapa/file-cache-js/blob/bc4b4d41a1bd58a211da9bc4ce76a4a3b40c9021/src/lib/FileCache.ts#L113)

**`Internal`**

***

### cacheDirectory?

> `optional` **cacheDirectory?**: `string`

Defined in: [src/lib/FileCache.ts:25](https://github.com/ayapapa/file-cache-js/blob/bc4b4d41a1bd58a211da9bc4ce76a4a3b40c9021/src/lib/FileCache.ts#L25)

Cache directory. 
Default is "`process.cwd()`/.cache".

***

### invalidTtlMs?

> `optional` **invalidTtlMs?**: `number`

Defined in: [src/lib/FileCache.ts:108](https://github.com/ayapapa/file-cache-js/blob/bc4b4d41a1bd58a211da9bc4ce76a4a3b40c9021/src/lib/FileCache.ts#L108)

Validity period in milliseconds for the modification time of invalid `cache file`. <br>
If `removeInvalid` is true and the specified amount of time has elapsed since the modification time of an invalid `cache file`, it is forcibly removed. 
Minimum is `0` if a value lower than this is specified, this minimum value is used. 
Default is `600000`.

***

### lockDirectory?

> `optional` **lockDirectory?**: `string`

Defined in: [src/lib/FileCache.ts:55](https://github.com/ayapapa/file-cache-js/blob/bc4b4d41a1bd58a211da9bc4ce76a4a3b40c9021/src/lib/FileCache.ts#L55)

Specifies the directory path to stored locking imformations.
If it has been specified, use this as the top priority.
The directory is determined based on the following order of priority:<br>
 1. Specified via an `Config` (user's explicit intent)
 2. "`process.cwd()`/.lock" (".lock" under `current working directory at runtime`)
Note: In cases where the directory is explicitly specified (1 or 2 above), an error occurs if the specified directory does not exist and its creation fails.

***

### lockTimeoutMs?

> `optional` **lockTimeoutMs?**: `number`

Defined in: [src/lib/FileCache.ts:63](https://github.com/ayapapa/file-cache-js/blob/bc4b4d41a1bd58a211da9bc4ce76a4a3b40c9021/src/lib/FileCache.ts#L63)

Maximum wait time to acquire the lock [milliseconds]. <br>
`0` does not wait for the preceding unlock. 
The minimum value is `0`; if a value lower than this is specified, this minimum value is used.
Default is `1000`.

***

### lockTtlMs?

> `optional` **lockTtlMs?**: `number`

Defined in: [src/lib/FileCache.ts:73](https://github.com/ayapapa/file-cache-js/blob/bc4b4d41a1bd58a211da9bc4ce76a4a3b40c9021/src/lib/FileCache.ts#L73)

Lock validity period (time to live): the maximum time [milliseconds] from lock acquisition 
until the cache operation completes execution. An error (TTLExceeded) occurs if this 
period is exceeded. 
If it's thrown, set this longer.
The minimum value is `1000`; if a value lower than this is specified, this minimum value is used.
Default is `1000`.

***

### logger?

> `optional` **logger?**: [`LogProvider`](../type-aliases/LogProvider.md)

Defined in: [src/lib/FileCache.ts:38](https://github.com/ayapapa/file-cache-js/blob/bc4b4d41a1bd58a211da9bc4ce76a4a3b40c9021/src/lib/FileCache.ts#L38)

Logger
Default is `DefaultLogger`

***

### purgeProbability?

> `optional` **purgeProbability?**: `number`

Defined in: [src/lib/FileCache.ts:80](https://github.com/ayapapa/file-cache-js/blob/bc4b4d41a1bd58a211da9bc4ce76a4a3b40c9021/src/lib/FileCache.ts#L80)

The probability (rate) at which old cache entries are removed. 
For example, if you specify `0.2`, the `purge` operation will occur approximately once every five operations(`set`, `get`, or `remove`). 
Default is `0.01`. The minimum is `0`, and the maximum is `1.0`. Values ​​outside this range will be adjusted to the minimum or maximum.

***

### removeInvalid?

> `optional` **removeInvalid?**: `boolean`

Defined in: [src/lib/FileCache.ts:100](https://github.com/ayapapa/file-cache-js/blob/bc4b4d41a1bd58a211da9bc4ce76a4a3b40c9021/src/lib/FileCache.ts#L100)

Specifies whether to remove invalid cache files.
See also `invalidTtlMs`.

***

### retriesOnIoErr?

> `optional` **retriesOnIoErr?**: `number`

Defined in: [src/lib/FileCache.ts:87](https://github.com/ayapapa/file-cache-js/blob/bc4b4d41a1bd58a211da9bc4ce76a4a3b40c9021/src/lib/FileCache.ts#L87)

Number of retries in the event of an I/O error. 
Default is `1`. 
Min is `0`. If a negative value is specified, it will be adjusted to the minimum.

***

### retryIoIntervalMs?

> `optional` **retryIoIntervalMs?**: `number`

Defined in: [src/lib/FileCache.ts:94](https://github.com/ayapapa/file-cache-js/blob/bc4b4d41a1bd58a211da9bc4ce76a4a3b40c9021/src/lib/FileCache.ts#L94)

Retry interval for IO errors (in milliseconds)
Default is `100`. 
Min is `100`. Values ​​below the minimum will be adjusted to the minimum.

***

### ttlMs?

> `optional` **ttlMs?**: `number`

Defined in: [src/lib/FileCache.ts:32](https://github.com/ayapapa/file-cache-js/blob/bc4b4d41a1bd58a211da9bc4ce76a4a3b40c9021/src/lib/FileCache.ts#L32)

Cache validity period (milliseconds)
If a value of `0` or less is specified, there is no expiration.
The default is `600000`', which means 10 minutes.

***

### withLock?

> `optional` **withLock?**: `boolean`

Defined in: [src/lib/FileCache.ts:45](https://github.com/ayapapa/file-cache-js/blob/bc4b4d41a1bd58a211da9bc4ce76a4a3b40c9021/src/lib/FileCache.ts#L45)

Specifies whether to apply exclusive control to cache file I/O operations 
during `get`, `set`, or `remove` actions. This helps avoid conflicts with other processes.
Default is `true`. If set to `false`, exclusive control is not applied, which may lead to conflicts with other processes.
