[**@ayapapa-npm/file-cache-js**](../api.md)

***

[@ayapapa-npm/file-cache-js](../api.md) / Config

# Interface: Config

Defined in: [src/lib/FileCache.ts:18](https://github.com/ayapapa/file-cache-js/blob/ae9148b284056e87c1c2c530231ffa7901d348a9/src/lib/FileCache.ts#L18)

Configurations.

## Properties

### cacheDirectory?

> `optional` **cacheDirectory?**: `string`

Defined in: [src/lib/FileCache.ts:45](https://github.com/ayapapa/file-cache-js/blob/ae9148b284056e87c1c2c530231ffa7901d348a9/src/lib/FileCache.ts#L45)

Cache directory. 
Default is "`process.cwd()`/.cache".

***

### invalidTtlMs?

> `optional` **invalidTtlMs?**: `number`

Defined in: [src/lib/FileCache.ts:100](https://github.com/ayapapa/file-cache-js/blob/ae9148b284056e87c1c2c530231ffa7901d348a9/src/lib/FileCache.ts#L100)

Validity period in milliseconds for the modification time of invalid `cache file`. <br>
If `removeInvalid` is true and the specified amount of time has elapsed since the modification time of an invalid `cache file`, it is forcibly deleted. 
Minimum is `0` if a value lower than this is specified, this minimum value is used. 
Default is `10000`.

***

### lockDirectory?

> `optional` **lockDirectory?**: `string` \| `null`

Defined in: [src/lib/FileCache.ts:61](https://github.com/ayapapa/file-cache-js/blob/ae9148b284056e87c1c2c530231ffa7901d348a9/src/lib/FileCache.ts#L61)

Specifies the directory path to stored locking imformations.
If it has been specified, use this as the top priority.
The directory is determined based on the following order of priority:<br>
 1. Specified via an `Config` (user's explicit intent)
 2. "`process.cwd()`/.lock" (".lock" under `current working directory at runtime`)
Note: In cases where the directory is explicitly specified (1 or 2 above), an error occurs if the specified directory does not exist and its creation fails.

***

### lockTimeoutMs?

> `optional` **lockTimeoutMs?**: `number`

Defined in: [src/lib/FileCache.ts:69](https://github.com/ayapapa/file-cache-js/blob/ae9148b284056e87c1c2c530231ffa7901d348a9/src/lib/FileCache.ts#L69)

Maximum wait time to acquire the lock [milliseconds]. <br>
`0` does not wait for the preceding unlock. 
The minimum value is `0`; if a value lower than this is specified, this minimum value is used.
Default is `1000`.

***

### lockTtlMs?

> `optional` **lockTtlMs?**: `number`

Defined in: [src/lib/FileCache.ts:79](https://github.com/ayapapa/file-cache-js/blob/ae9148b284056e87c1c2c530231ffa7901d348a9/src/lib/FileCache.ts#L79)

Lock validity period (time to live): the maximum time [milliseconds] from lock acquisition 
until the cache operation completes execution. An error (TTLExceeded) occurs if this 
period is exceeded. 
If it's thrown, set this longer.
The minimum value is `1000`; if a value lower than this is specified, this minimum value is used.
Default is `1000`.

***

### purgeProbability?

> `optional` **purgeProbability?**: `number`

Defined in: [src/lib/FileCache.ts:86](https://github.com/ayapapa/file-cache-js/blob/ae9148b284056e87c1c2c530231ffa7901d348a9/src/lib/FileCache.ts#L86)

The probability (rate) at which old cache entries are removed. 
For example, if `0.2` is specified, one removal operation will occur for every five operations (`set`, `get`, or `remove`). 
Default is `0.1`. The minimum is `0`, and the maximum is `1.0`. Values ​​outside this range will be adjusted to the minimum or maximum.

***

### removeInvalid?

> `optional` **removeInvalid?**: `boolean`

Defined in: [src/lib/FileCache.ts:92](https://github.com/ayapapa/file-cache-js/blob/ae9148b284056e87c1c2c530231ffa7901d348a9/src/lib/FileCache.ts#L92)

Specifies whether to remove invalid cache files.
See also `invalidTtlMs`.

***

### retriesOnIoErr?

> `optional` **retriesOnIoErr?**: `number`

Defined in: [src/lib/FileCache.ts:32](https://github.com/ayapapa/file-cache-js/blob/ae9148b284056e87c1c2c530231ffa7901d348a9/src/lib/FileCache.ts#L32)

Number of retries in the event of an I/O error. 
Default is `1`. 
Min is `0`. If a negative value is specified, it will be adjusted to the minimum.

***

### retryIoIntervalMs?

> `optional` **retryIoIntervalMs?**: `number`

Defined in: [src/lib/FileCache.ts:39](https://github.com/ayapapa/file-cache-js/blob/ae9148b284056e87c1c2c530231ffa7901d348a9/src/lib/FileCache.ts#L39)

Retry interval for IO errors (in milliseconds)
Default is `100`. 
Min is `100`. Values ​​below the minimum will be adjusted to the minimum.

***

### ttlMs?

> `optional` **ttlMs?**: `number`

Defined in: [src/lib/FileCache.ts:25](https://github.com/ayapapa/file-cache-js/blob/ae9148b284056e87c1c2c530231ffa7901d348a9/src/lib/FileCache.ts#L25)

Cache validity period (milliseconds)
If a value of `0` or less is specified, there is no expiration date.
The default is `600000`', which means 10 minutes.
Min is `0`.

***

### withLock?

> `optional` **withLock?**: `boolean`

Defined in: [src/lib/FileCache.ts:51](https://github.com/ayapapa/file-cache-js/blob/ae9148b284056e87c1c2c530231ffa7901d348a9/src/lib/FileCache.ts#L51)

Specifies whether to apply exclusive control to cache file I/O operations 
during `get`, `set`, or `remove` actions. This helps avoid conflicts with other processes.
