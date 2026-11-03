import path from 'node:path';

export function getCacheDirPath() {
  return path.join(process.cwd(), '.cache');
}

export function getCacheFilePath(key: string) {
  return path.join(getCacheDirPath(), `${key}.json`);
}

