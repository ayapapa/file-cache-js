[**@ayapapa-npm/file-cache-js**](../api.md)

***

[@ayapapa-npm/file-cache-js](../api.md) / Config

# Interface: Config

Defined in: [src/lib/FileCache.ts:15](https://github.com/ayapapa/file-cache-js/blob/94bfa40c5a7735eaab2423903b97e220a84031ad/src/lib/FileCache.ts#L15)

## Properties

### cacheDir?

> `optional` **cacheDir?**: `string`

Defined in: [src/lib/FileCache.ts:38](https://github.com/ayapapa/file-cache-js/blob/94bfa40c5a7735eaab2423903b97e220a84031ad/src/lib/FileCache.ts#L38)

***

### invalidTtlMs?

> `optional` **invalidTtlMs?**: `number`

Defined in: [src/lib/FileCache.ts:78](https://github.com/ayapapa/file-cache-js/blob/94bfa40c5a7735eaab2423903b97e220a84031ad/src/lib/FileCache.ts#L78)

Validity period in milliseconds for the modification time of invalid `cache file`. <br>
If `removeInvalid` is true and the specified amount of time has elapsed since the modification time of an invalid `cache file`, it is forcibly deleted. 
Minimum is `0`.
Default is 10000.

***

### lockTimeoutMs?

> `optional` **lockTimeoutMs?**: `number`

Defined in: [src/lib/FileCache.ts:50](https://github.com/ayapapa/file-cache-js/blob/94bfa40c5a7735eaab2423903b97e220a84031ad/src/lib/FileCache.ts#L50)

排他制御のロック獲得までの最大待ち時間（コメントはコピーせよ）
withLockがtrueのときのみ有効。
Min設定あり。

***

### lockTtlMs?

> `optional` **lockTtlMs?**: `number`

Defined in: [src/lib/FileCache.ts:57](https://github.com/ayapapa/file-cache-js/blob/94bfa40c5a7735eaab2423903b97e220a84031ad/src/lib/FileCache.ts#L57)

排他制御のロック獲得までの最大待ち時間（コメントはコピーせよ）
withLockがtrueのときのみ有効。
Min設定あり。

***

### purgeProbability?

> `optional` **purgeProbability?**: `number`

Defined in: [src/lib/FileCache.ts:64](https://github.com/ayapapa/file-cache-js/blob/94bfa40c5a7735eaab2423903b97e220a84031ad/src/lib/FileCache.ts#L64)

古いキャッシュの除去を実行する確率（割合）。
例えば、`0.2`を指定した場合は、5回の操作（put, get, remove)で１回の除去が行われる。
Default is `0.1`. Min is `0`. Max is `1.0`.　範囲外は、MinまたはMaxに調整される。

***

### removeInvalid?

> `optional` **removeInvalid?**: `boolean`

Defined in: [src/lib/FileCache.ts:70](https://github.com/ayapapa/file-cache-js/blob/94bfa40c5a7735eaab2423903b97e220a84031ad/src/lib/FileCache.ts#L70)

不正なキャッシュファイルを削除するか否か 。
See also `invalidTtlMs`.

***

### retriesOnIoErr?

> `optional` **retriesOnIoErr?**: `number`

Defined in: [src/lib/FileCache.ts:27](https://github.com/ayapapa/file-cache-js/blob/94bfa40c5a7735eaab2423903b97e220a84031ad/src/lib/FileCache.ts#L27)

IOエラー時のリトライ回数。
Default is `1`. Min is `0`;

***

### retryIoIntervalMs?

> `optional` **retryIoIntervalMs?**: `number`

Defined in: [src/lib/FileCache.ts:33](https://github.com/ayapapa/file-cache-js/blob/94bfa40c5a7735eaab2423903b97e220a84031ad/src/lib/FileCache.ts#L33)

IOエラー時のリトライ間隔(ミリ秒)
Default is `100`. Min is `100`. Min未満はMinに調整される。

***

### ttlMs?

> `optional` **ttlMs?**: `number`

Defined in: [src/lib/FileCache.ts:21](https://github.com/ayapapa/file-cache-js/blob/94bfa40c5a7735eaab2423903b97e220a84031ad/src/lib/FileCache.ts#L21)

キャッシュ有効期間(ミリ秒)
`0`以下を指定した時は、有効期限なし。
Default is '600000'. Min is 0.

***

### withLock?

> `optional` **withLock?**: `boolean`

Defined in: [src/lib/FileCache.ts:43](https://github.com/ayapapa/file-cache-js/blob/94bfa40c5a7735eaab2423903b97e220a84031ad/src/lib/FileCache.ts#L43)

`get`/`put`/`remove`時に、キャッシュファイルIO処理に排他制御を掛けるか否か
