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
| `cache key`        | A key used to apply a lock. When multiple operations use the same key, they are executed sequentially. If the specified `lock key` contains characters that are invalid for a file path, it is converted into a valid file path by replacing those characters with underscores and removing double quotation marks. | `lock file`, `temporary lock file`, `lock sharers` | 
| `cache directory`  | A directory where `lock file`s are stored. | `lock file`, [Configurations](#configurations) |
| `cache file`       | It is associated with the specified `lock key` and stores information related to the lock owner, the actual expiration time, and so forth. <br>For example, if the `lock key` is "key001", a file 

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

