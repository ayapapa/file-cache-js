[![CI](https://github.com/ayapapa/file-cache-js/actions/workflows/ci.yml/badge.svg)](https://github.com/ayapapa/file-cache-js/actions/workflows/ci.yml)
![Coverage](https://raw.githubusercontent.com/ayapapa/file-cache-js/main/badges/coverage-total.svg)
![Branches](https://raw.githubusercontent.com/ayapapa/file-cache-js/main/badges/coverage-branches.svg)
![Functions](https://raw.githubusercontent.com/ayapapa/file-cache-js/main/badges/coverage-functions.svg)
![Lines](https://raw.githubusercontent.com/ayapapa/file-cache-js/main/badges/coverage-lines.svg)
![Statements](https://raw.githubusercontent.com/ayapapa/file-cache-js/main/badges/coverage-statements.svg)

# file-cache-js

## Table of contents
[Overview](#overview) | [Definitions of Terms](#definitions-of-terms) | [Features](#features) | [Installation](#installation) | [API Reference](#api-reference) | [Usage](#usage) | [Configurations](#configurations) | [Errors](#errors) | [Examples](#examples)

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
 
## API Reference
[API document](https://github.com/ayapapa/file-cache-js/blob/main/docs/api.md)

