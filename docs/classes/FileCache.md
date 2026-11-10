[**@ayapapa-npm/file-cache-js**](../api.md)

***

[@ayapapa-npm/file-cache-js](../api.md) / FileCache

# Class: FileCache

Defined in: [src/lib/FileCache.ts:126](https://github.com/ayapapa/file-cache-js/blob/bf2041a320903af0d24709fd2158acef3e36490f/src/lib/FileCache.ts#L126)

A cache service class that uses files. 

Associates a given value with a specified `cache key` and stores it in a `cache file` in JSON format. 
The value must be of a type that can be converted to JSON. 
Types such as `Map`, `Set`, `Symbol`, `BigInt`, or `Function` cannot be converted 
correctly—they may be ignored, converted to `null` or an empty object, or result in an error.
If you wish to cache these values, please convert them into a format 
that can be serialized to JSON before and after the caching process.
The `cache file` is stored within a `cache directory` and named "`cache key`.json". 
If the specified `cache key` contains characters that are invalid for a file path,
it is converted into a valid file path by replacing those characters with underscores
and removing double quotation marks.

## Constructors

### Constructor

> **new FileCache**(`config?`): `FileCache`

Defined in: [src/lib/FileCache.ts:182](https://github.com/ayapapa/file-cache-js/blob/bf2041a320903af0d24709fd2158acef3e36490f/src/lib/FileCache.ts#L182)

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

Defined in: [src/lib/FileCache.ts:209](https://github.com/ayapapa/file-cache-js/blob/bf2041a320903af0d24709fd2158acef3e36490f/src/lib/FileCache.ts#L209)

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
the `set` operation (or `undefined` if no `cache key' exists for the given 'cache key').

#### Throws

[InvalidCache](InvalidCache.md)    If cache contents is not valid Json or, has not mandatory propaties.

#### Throws

[FileCacheError](FileCacheError.md)  If invalid `cache key', file IO error, or lock error.

***

### getAll()

> **getAll**(`options?`): `Promise`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/lib/FileCache.ts:227](https://github.com/ayapapa/file-cache-js/blob/bf2041a320903af0d24709fd2158acef3e36490f/src/lib/FileCache.ts#L227)

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

[InvalidCache](InvalidCache.md)    If cache contents is not valid Json or, has not mandatory propaties.

#### Throws

[FileCacheError](FileCacheError.md)  If file IO error, or lock error.

***

### getConfig()

> **getConfig**(): `Required`\<[`Config`](../interfaces/Config.md)\>

Defined in: [src/lib/FileCache.ts:261](https://github.com/ayapapa/file-cache-js/blob/bf2041a320903af0d24709fd2158acef3e36490f/src/lib/FileCache.ts#L261)

Get the current configurations.

#### Returns

`Required`\<[`Config`](../interfaces/Config.md)\>

Copy of the current configurations.

***

### purge()

> **purge**(`options?`): `Promise`\<`Record`\<`string`, `unknown`\> \| `undefined`\>

Defined in: [src/lib/FileCache.ts:274](https://github.com/ayapapa/file-cache-js/blob/bf2041a320903af0d24709fd2158acef3e36490f/src/lib/FileCache.ts#L274)

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

#### Throws

[InvalidCache](InvalidCache.md)    If cache contents is not valid Json or, has not mandatory propaties.

#### Throws

[FileCacheError](FileCacheError.md)  If invalid `cache key', file IO error, or lock error.

***

### remove()

> **remove**(`key`): `Promise`\<`void`\>

Defined in: [src/lib/FileCache.ts:314](https://github.com/ayapapa/file-cache-js/blob/bf2041a320903af0d24709fd2158acef3e36490f/src/lib/FileCache.ts#L314)

Remove the `cache file` corresponding to a given `cache key`. 
If the `cache file` is considered invalid, it is deleted according to the `removeInvalid` 
and `invalidTtlMs` settings, resulting in either a return value of `undefined` or an error.

#### Parameters

##### key

`string`

`cache key`

#### Returns

`Promise`\<`void`\>

#### Throws

[InvalidCache](InvalidCache.md)    If cache contents is not valid Json or, has not mandatory propaties.

#### Throws

[FileCacheError](FileCacheError.md)  If invalid `cache key', file IO error, or lock error.

***

### set()

> **set**(`key`, `value`, `options?`): `Promise`\<`void`\>

Defined in: [src/lib/FileCache.ts:344](https://github.com/ayapapa/file-cache-js/blob/bf2041a320903af0d24709fd2158acef3e36490f/src/lib/FileCache.ts#L344)

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
The value must be of a type that can be converted to JSON. 
Types such as `Map`, `Set`, `Symbol`, `BigInt`, or `Function` cannot be converted 
correctly—they may be ignored, converted to `null` or an empty object, or result in an error.
If you wish to cache these values, please convert them into a format 
that can be serialized to JSON before the caching process.
@param options Options.
- ttlMs: `number` type. Takes precedence over the configuration passed to the constructor. 
If a value of `0` or less is specified, there is no expiration.
@throws  {@link FileCacheError}  If invalid `cache key', file IO error, or lock error.

##### options?

###### ttlMs?

`number`

#### Returns

`Promise`\<`void`\>

***

### getDefaultConf()

> `static` **getDefaultConf**(): [`Config`](../interfaces/Config.md)

Defined in: [src/lib/FileCache.ts:152](https://github.com/ayapapa/file-cache-js/blob/bf2041a320903af0d24709fd2158acef3e36490f/src/lib/FileCache.ts#L152)

Static methods.

#### Returns

[`Config`](../interfaces/Config.md)
