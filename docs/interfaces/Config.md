[**@ayapapa-npm/file-cache-js**](../api.md)

***

[@ayapapa-npm/file-cache-js](../api.md) / Config

# Interface: Config

Defined in: [src/lib/FileCache.ts:18](https://github.com/ayapapa/file-cache-js/blob/71e03dac51b762c305df5128dce5a82d7a1c9edf/src/lib/FileCache.ts#L18)

Configurations.

## Properties

### cacheDirectory?

> `optional` **cacheDirectory?**: `string`

Defined in: [src/lib/FileCache.ts:23](https://github.com/ayapapa/file-cache-js/blob/71e03dac51b762c305df5128dce5a82d7a1c9edf/src/lib/FileCache.ts#L23)

Cache directory. 
Default is "`process.cwd()`/.cache".

***

### invalidTtlMs?

> `optional` **invalidTtlMs?**: `number`

Defined in: [src/lib/FileCache.ts:99](https://github.com/ayapapa/file-cache-js/blob/71e03dac51b762c305df5128dce5a82d7a1c9edf/src/lib/FileCache.ts#L99)

Validity period in milliseconds for the modification time of invalid `cache file`. <br>
If `removeInvalid` is true and the specified amount of time has elapsed since the modification time of an invalid `cache file`, it is forcibly removed. 
Minimum is `0` if a value lower than this is specified, this minimum value is used. 
Default is `600000`.

***

### lockDirectory?

> `optional` **lockDirectory?**: `string`

Defined in: [src/lib/FileCache.ts:46](https://github.com/ayapapa/file-cache-js/blob/71e03dac51b762c305df5128dce5a82d7a1c9edf/src/lib/FileCache.ts#L46)

Specifies the directory path to stored locking imformations.
If it has been specified, use this as the top priority.
The directory is determined based on the following order of priority:<br>
 1. Specified via an `Config` (user's explicit intent)
 2. "`process.cwd()`/.lock" (".lock" under `current working directory at runtime`)
Note: In cases where the directory is explicitly specified (1 or 2 above), an error occurs if the specified directory does not exist and its creation fails.

***

### lockTimeoutMs?

> `optional` **lockTimeoutMs?**: `number`

Defined in: [src/lib/FileCache.ts:54](https://github.com/ayapapa/file-cache-js/blob/71e03dac51b762c305df5128dce5a82d7a1c9edf/src/lib/FileCache.ts#L54)

Maximum wait time to acquire the lock [milliseconds]. <br>
`0` does not wait for the preceding unlock. 
The minimum value is `0`; if a value lower than this is specified, this minimum value is used.
Default is `1000`.

***

### lockTtlMs?

> `optional` **lockTtlMs?**: `number`

Defined in: [src/lib/FileCache.ts:64](https://github.com/ayapapa/file-cache-js/blob/71e03dac51b762c305df5128dce5a82d7a1c9edf/src/lib/FileCache.ts#L64)

Lock validity period (time to live): the maximum time [milliseconds] from lock acquisition 
until the cache operation completes execution. An error (TTLExceeded) occurs if this 
period is exceeded. 
If it's thrown, set this longer.
The minimum value is `1000`; if a value lower than this is specified, this minimum value is used.
Default is `1000`.

***

### purgeProbability?

> `optional` **purgeProbability?**: `number`

Defined in: [src/lib/FileCache.ts:71](https://github.com/ayapapa/file-cache-js/blob/71e03dac51b762c305df5128dce5a82d7a1c9edf/src/lib/FileCache.ts#L71)

The probability (rate) at which old cache entries are removed. 
For example, if `0.2` is specified, one removal operation will occur for every five operations (`set`, `get`, or `remove`). 
Default is `0.1`. The minimum is `0`, and the maximum is `1.0`. Values ​​outside this range will be adjusted to the minimum or maximum.

***

### removeInvalid?

> `optional` **removeInvalid?**: `boolean`

Defined in: [src/lib/FileCache.ts:91](https://github.com/ayapapa/file-cache-js/blob/71e03dac51b762c305df5128dce5a82d7a1c9edf/src/lib/FileCache.ts#L91)

Specifies whether to remove invalid cache files.
See also `invalidTtlMs`.

***

### retriesOnIoErr?

> `optional` **retriesOnIoErr?**: `number`

Defined in: [src/lib/FileCache.ts:78](https://github.com/ayapapa/file-cache-js/blob/71e03dac51b762c305df5128dce5a82d7a1c9edf/src/lib/FileCache.ts#L78)

Number of retries in the event of an I/O error. 
Default is `1`. 
Min is `0`. If a negative value is specified, it will be adjusted to the minimum.

***

### retryIoIntervalMs?

> `optional` **retryIoIntervalMs?**: `number`

Defined in: [src/lib/FileCache.ts:85](https://github.com/ayapapa/file-cache-js/blob/71e03dac51b762c305df5128dce5a82d7a1c9edf/src/lib/FileCache.ts#L85)

Retry interval for IO errors (in milliseconds)
Default is `100`. 
Min is `100`. Values ​​below the minimum will be adjusted to the minimum.

***

### ttlMs?

> `optional` **ttlMs?**: `number`

Defined in: [src/lib/FileCache.ts:30](https://github.com/ayapapa/file-cache-js/blob/71e03dac51b762c305df5128dce5a82d7a1c9edf/src/lib/FileCache.ts#L30)

Cache validity period (milliseconds)
If a value of `0` or less is specified, there is no expiration.
The default is `600000`', which means 10 minutes.

***

### withLock?

> `optional` **withLock?**: `boolean`

Defined in: [src/lib/FileCache.ts:36](https://github.com/ayapapa/file-cache-js/blob/71e03dac51b762c305df5128dce5a82d7a1c9edf/src/lib/FileCache.ts#L36)

Specifies whether to apply exclusive control to cache file I/O operations 
during `get`, `set`, or `remove` actions. This helps avoid conflicts with other processes.
