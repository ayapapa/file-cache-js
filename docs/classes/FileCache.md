[**@ayapapa-npm/file-cache-js**](../api.md)

***

[@ayapapa-npm/file-cache-js](../api.md) / FileCache

# Class: FileCache

Defined in: [src/lib/FileCache.ts:114](https://github.com/ayapapa/file-cache-js/blob/fbe5252d849e2bba60c00f123621b38ec07863f1/src/lib/FileCache.ts#L114)

A cache service class that uses files. 

Associates a given value with a specified `cache key` and stores it in a `cache file` in JSON format. 
The value must be of a type that can be converted to JSON. 
Types such as `Map`, `Set`, `Symbol`, `BigInt`, or `Function` cannot be converted 
correctly—they may be ignored, converted to `null` or an empty object, or result in an error.
The `cache file` is stored within a `cache directory` and named "`cache key`.json". 
If the specified `cache key` contains characters that are invalid for a file path,
it is converted into a valid file path by replacing those characters with underscores
and removing double quotation marks.

## Constructors

### Constructor

> **new FileCache**(`config?`): `FileCache`

Defined in: [src/lib/FileCache.ts:169](https://github.com/ayapapa/file-cache-js/blob/fbe5252d849e2bba60c00f123621b38ec07863f1/src/lib/FileCache.ts#L169)

Constructor.

#### Parameters

##### config?

[`Config`](../interfaces/Config.md) = `FileCache.#defaultConfig`

Configurations.
Any value other than those explicitly specified will default to the default setting. 
If a null-like value (null or undefined) is provided, it is treated as if the value had been omitted.

#### Returns

`FileCache`

## Methods

### get()

> **get**(`key`): `Promise`\<`unknown`\>

Defined in: [src/lib/FileCache.ts:199](https://github.com/ayapapa/file-cache-js/blob/fbe5252d849e2bba60c00f123621b38ec07863f1/src/lib/FileCache.ts#L199)

Get the `cache value` corresponding to the `cache key`.

#### Parameters

##### key

`string`

`cache key`
If the specified `cache key` contains characters that are invalid for a file path, 
it is converted into a valid file path by replacing those characters with underscores 
and removing double quotation marks.

#### Returns

`Promise`\<`unknown`\>

A promise that resolves to the `cache value' provided during 
the `put` operation (or `undefined` if no `cache key' exists for the given 'cache key').

#### Throws

- `InvalidCache` If contents is not valid Json or, has not mandatory propaties. 
- `FileCacheError` If invalid `cache key', file IO error, or lock error.

***

### getAll()

> **getAll**(`options?`): `Promise`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/lib/FileCache.ts:218](https://github.com/ayapapa/file-cache-js/blob/fbe5252d849e2bba60c00f123621b38ec07863f1/src/lib/FileCache.ts#L218)

Get all `cache key`s and their corresponding `cache value`s. 
Expired cache entries are listed with a value of `undefined`.

#### Parameters

##### options?

Options. <br>
- throwIfInvalid: `boolean` — If `true`, an error is thrown when an invalid cache file is encountered. 
Note that the determination of whether a `cache file` is invalid depends on the `removeInvalid` and 
`invalidTtlMs` settings defined in the `Config` object at the time of construction. (See also `Config`.)

###### throwIfInvalid?

`boolean`

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\>\>

A promise that resolves to the retrieved `cache key`s and `cache value`s (in the format { `cache key`: `cache value` }).

#### Throws

- `InvalidCache` If contents is not valid Json or, has not mandatory propaties. 
- `FileCacheError` If file IO error, or lock error.

***

### getConfig()

> **getConfig**(): `Required`\<[`Config`](../interfaces/Config.md)\>

Defined in: [src/lib/FileCache.ts:242](https://github.com/ayapapa/file-cache-js/blob/fbe5252d849e2bba60c00f123621b38ec07863f1/src/lib/FileCache.ts#L242)

Get the current configurations.

#### Returns

`Required`\<[`Config`](../interfaces/Config.md)\>

Copy of the current configurations.

***

### purge()

> **purge**(`options?`): `Promise`\<`Record`\<`string`, `unknown`\> \| `undefined`\>

Defined in: [src/lib/FileCache.ts:253](https://github.com/ayapapa/file-cache-js/blob/fbe5252d849e2bba60c00f123621b38ec07863f1/src/lib/FileCache.ts#L253)

Perform a mass removal of the cash.

#### Parameters

##### options?

Options.
- force: `boolean` — If `true`, deletes all cache files, including those identified as invalid. 
Note that the determination of whether a cache file is "invalid" depends on the `removeInvalid` and `invalidTtlMs` settings in the `Config` object provided at instantiation. (See also `Config`.)

###### force?

`boolean`

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\> \| `undefined`\>

An object containing the keys that failed to be deleted and the reasons for the failure; returns `undefined` if no deletions failed.

***

### remove()

> **remove**(`key`): `Promise`\<`void`\>

Defined in: [src/lib/FileCache.ts:286](https://github.com/ayapapa/file-cache-js/blob/fbe5252d849e2bba60c00f123621b38ec07863f1/src/lib/FileCache.ts#L286)

`cache key`に対応する`chache file`を削除する。
不正`chache file`である場合は、`removeInvalid`および`invalidTtlMs`の設定に従い削除され`undefined`が返るか、もしくは、エラー。

#### Parameters

##### key

`string`

キー

#### Returns

`Promise`\<`void`\>

#### Throws

- `InvalidCache` If contents is not valid Json or, has not mandatory propaties. 
- `FileCacheError` If invalid `cache key', file IO error, or lock error.

***

### set()

> **set**(`key`, `value`, `options?`): `Promise`\<`void`\>

Defined in: [src/lib/FileCache.ts:310](https://github.com/ayapapa/file-cache-js/blob/fbe5252d849e2bba60c00f123621b38ec07863f1/src/lib/FileCache.ts#L310)

Store `cache key' and `cache value` ​​in a `cache file`. 
If a `cache file` with the same 'cache key' already exists, it will be overwritten.
@param key     `cache key'
If the specified `cache key` contains characters that are invalid for a file path, 
it is converted into a valid file path by replacing those characters with underscores 
and removing double quotation marks.

#### Parameters

##### key

`string`

##### value

`unknown`

`cache value'
@param options Options.
- ttlMs: `number` type. Takes precedence over the configuration passed to the constructor.
@throws  `FileCacheError` If invalid `cache key', file IO error, or lock error.

##### options?

###### ttlMs?

`number`

#### Returns

`Promise`\<`void`\>

***

### getDefaultConf()

> `static` **getDefaultConf**(): `object`

Defined in: [src/lib/FileCache.ts:139](https://github.com/ayapapa/file-cache-js/blob/fbe5252d849e2bba60c00f123621b38ec07863f1/src/lib/FileCache.ts#L139)

Static methods.

#### Returns

##### cacheDir

> **cacheDir**: `string`

Cache directory. 
Default is "`process.cwd()`/.cache".

##### invalidTtlMs

> **invalidTtlMs**: `number`

Validity period in milliseconds for the modification time of invalid `cache file`. <br>
If `removeInvalid` is true and the specified amount of time has elapsed since the modification time of an invalid `cache file`, it is forcibly deleted. 
Minimum is `0` if a value lower than this is specified, this minimum value is used. 
Default is `10000`.

##### lockTimeoutMs

> **lockTimeoutMs**: `number`

Maximum wait time to acquire the lock [milliseconds]. <br>
`0` does not wait for the preceding unlock. 
The minimum value is `0`; if a value lower than this is specified, this minimum value is used.
Default is `1000`.

##### lockTtlMs

> **lockTtlMs**: `number`

Lock validity period (time to live): the maximum time [milliseconds] from lock acquisition 
until the cache operation completes execution. An error (TTLExceeded) occurs if this 
period is exceeded. 
If it's thrown, set this longer.
The minimum value is `1000`; if a value lower than this is specified, this minimum value is used.
Default is `1000`.

##### purgeProbability

> **purgeProbability**: `number`

The probability (rate) at which old cache entries are removed. 
For example, if `0.2` is specified, one removal operation will occur for every five operations (`put`, `get`, or `remove`). 
Default is `0.1`. The minimum is `0`, and the maximum is `1.0`. Values ​​outside this range will be adjusted to the minimum or maximum.

##### removeInvalid

> **removeInvalid**: `boolean`

Specifies whether to remove invalid cache files.
See also `invalidTtlMs`.

##### retriesOnIoErr

> **retriesOnIoErr**: `number`

Number of retries in the event of an I/O error. 
Default is `1`. 
Min is `0`. If a negative value is specified, it will be adjusted to the minimum.

##### retryIoIntervalMs

> **retryIoIntervalMs**: `number`

Retry interval for IO errors (in milliseconds)
Default is `100`. 
Min is `100`. Values ​​below the minimum will be adjusted to the minimum.

##### ttlMs

> **ttlMs**: `number`

Cache validity period (milliseconds)
If a value of `0` or less is specified, there is no expiration date.
The default is `600000`', which means 10 minutes.
Min is `0`.

##### withLock

> **withLock**: `boolean`

Specifies whether to apply exclusive control to cache file I/O operations 
during `get`, `set`, or `remove` actions. This helps avoid conflicts with other processes.
