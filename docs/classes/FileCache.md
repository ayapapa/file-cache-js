[**@ayapapa-npm/file-cache-js**](../api.md)

***

[@ayapapa-npm/file-cache-js](../api.md) / FileCache

# Class: FileCache

Defined in: [src/lib/FileCache.ts:98](https://github.com/ayapapa/file-cache-js/blob/01fbe314f6b932bcc8438cfff6c56285b7717a9a/src/lib/FileCache.ts#L98)

ファイルを使ったキャッシュサービスクラス。

指定された`cache key`に紐づけて、指定され値をJSON形式で`cache file`に格納する。
値の型は、JSONに変換できるものに限ります。（Map, Set, Symbol, Bigint, Fnctionなどは、正常に変換できない（無視されたり、nullや、空オブジェクトになる）か、あるいは、エラーになります）
`cache file`は、"`cache key`.json"という名前で、`cache directory`下に格納される。
If the specified `cache key` contains characters that are invalid for a file path, 
it is converted into a valid file path by replacing those characters with underscores 
and removing double quotation marks.

## Constructors

### Constructor

> **new FileCache**(`config?`): `FileCache`

Defined in: [src/lib/FileCache.ts:151](https://github.com/ayapapa/file-cache-js/blob/01fbe314f6b932bcc8438cfff6c56285b7717a9a/src/lib/FileCache.ts#L151)

コンストラクタ

#### Parameters

##### config?

[`Config`](../interfaces/Config.md) = `FileCache.#defaultConfig`

設定。
null系(nullまたはundefined)指定じは、省略したもととして扱う。

#### Returns

`FileCache`

## Methods

### get()

> **get**(`key`): `Promise`\<`unknown`\>

Defined in: [src/lib/FileCache.ts:184](https://github.com/ayapapa/file-cache-js/blob/01fbe314f6b932bcc8438cfff6c56285b7717a9a/src/lib/FileCache.ts#L184)

キーに対応する値を取得

#### Parameters

##### key

`string`

`cache key`
If the specified `cache key` contains characters that are invalid for a file path, 
it is converted into a valid file path by replacing those characters with underscores 
and removing double quotation marks.

#### Returns

`Promise`\<`unknown`\>

putした時の値を返すプロミス、または、存在しない場合はundefined.

***

### getAll()

> **getAll**(`options?`): `Promise`\<`Record`\<`string`, `unknown`\>\>

Defined in: [src/lib/FileCache.ts:208](https://github.com/ayapapa/file-cache-js/blob/01fbe314f6b932bcc8438cfff6c56285b7717a9a/src/lib/FileCache.ts#L208)

全ての`cache key`とそれに対応する`cache value`を取得する。

#### Parameters

##### options?

オプション。 <br>
- throwIfInvalid: `boolean`  true なら、不正キャッシュファイルを発見した際にエラーを投げる。
ただし、 不正`cache file`判定は、コンストラクト時の`Config`の`removeInvalid`および`invalidTtlMs`に依存する。(see also `Config`.)

###### throwIfInvalid?

`true`

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\>\>

取得に成功した`cache key`と`cache value`({`cache key`: `cache value`})を解決するプロミス。

***

### getConfig()

> **getConfig**(): `Required`\<[`Config`](../interfaces/Config.md)\>

Defined in: [src/lib/FileCache.ts:172](https://github.com/ayapapa/file-cache-js/blob/01fbe314f6b932bcc8438cfff6c56285b7717a9a/src/lib/FileCache.ts#L172)

#### Returns

`Required`\<[`Config`](../interfaces/Config.md)\>

***

### purge()

> **purge**(`options?`): `Promise`\<`Record`\<`string`, `unknown`\> \| `undefined`\>

Defined in: [src/lib/FileCache.ts:429](https://github.com/ayapapa/file-cache-js/blob/01fbe314f6b932bcc8438cfff6c56285b7717a9a/src/lib/FileCache.ts#L429)

一定確率で古いキャッシュの一斉除去を行う

#### Parameters

##### options?

オプション
- force: `boolean` `true`なら、不正キャッシュファイルを除き、すべて削除。
ただし、 不正`cache file`判定は、コンストラクト時の`Config`の`removeInvalid`および`invalidTtlMs`に依存する。(see also `Config`.)

###### force?

`boolean`

#### Returns

`Promise`\<`Record`\<`string`, `unknown`\> \| `undefined`\>

***

### put()

> **put**(`key`, `value`, `options?`): `Promise`\<`void`\>

Defined in: [src/lib/FileCache.ts:245](https://github.com/ayapapa/file-cache-js/blob/01fbe314f6b932bcc8438cfff6c56285b7717a9a/src/lib/FileCache.ts#L245)

キーと値をキャッシュに格納する

#### Parameters

##### key

`string`

キー
If the specified `cache key` contains characters that are invalid for a file path, 
it is converted into a valid file path by replacing those characters with underscores 
and removing double quotation marks.

##### value

`unknown`

値

##### options?

オプション。
- ttlMs: number型。設定(config)に優先される。

###### ttlMs?

`number`

#### Returns

`Promise`\<`void`\>

***

### remove()

> **remove**(`key`): `Promise`\<`void`\>

Defined in: [src/lib/FileCache.ts:258](https://github.com/ayapapa/file-cache-js/blob/01fbe314f6b932bcc8438cfff6c56285b7717a9a/src/lib/FileCache.ts#L258)

キーに対応する値を削除する

#### Parameters

##### key

`string`

キー

#### Returns

`Promise`\<`void`\>

***

### getDefaultConf()

> `static` **getDefaultConf**(): `object`

Defined in: [src/lib/FileCache.ts:123](https://github.com/ayapapa/file-cache-js/blob/01fbe314f6b932bcc8438cfff6c56285b7717a9a/src/lib/FileCache.ts#L123)

Static methods.

#### Returns

##### cacheDir

> **cacheDir**: `string`

##### invalidTtlMs

> **invalidTtlMs**: `number`

Validity period in milliseconds for the modification time of invalid `cache file`. <br>
If `removeInvalid` is true and the specified amount of time has elapsed since the modification time of an invalid `cache file`, it is forcibly deleted. 
Minimum is `0`.
Default is 10000.

##### lockTimeoutMs

> **lockTimeoutMs**: `number`

排他制御のロック獲得までの最大待ち時間（コメントはコピーせよ）
withLockがtrueのときのみ有効。

##### lockTtlMs

> **lockTtlMs**: `number`

排他制御のロック獲得までの最大待ち時間（コメントはコピーせよ）
withLockがtrueのときのみ有効。

##### purgeProbability

> **purgeProbability**: `number`

古いキャッシュの除去を実行する確率（割合）。
例えば、`0.2`を指定した場合は、5回の操作（put, get, remove)で１回の除去が行われる。
Default is `0.1`. Min is `0`.

##### removeInvalid

> **removeInvalid**: `boolean`

不正なキャッシュファイルを削除するか否か 。
See also `invalidTtlMs`.

##### retriesOnIoErr

> **retriesOnIoErr**: `number`

IOエラー時のリトライ回数。
Default is `1`. Min is `0`;

##### retryIoIntervalMs

> **retryIoIntervalMs**: `number`

IOエラー時のリトライ間隔(ミリ秒)
Default is `100`. Min is `100`;

##### ttlMs

> **ttlMs**: `number`

キャッシュ有効期間(ミリ秒)
`0`以下を指定した時は、有効期限なし。
Default is '600000'. Min is 0.

##### withLock

> **withLock**: `boolean`

`get`/`put`/`remove`時に、キャッシュファイルIO処理に排他制御を掛けるか否か
