import path from 'node:path';

export function getCacheDirPath() {
  return path.join(process.cwd(), '.cache');
}

export function getCacheFilePath(key: string) {
  const encodedKey = key.replace(/[<>:/\\|?*]/g, () => '_').replace(/"/g, () => '');
  return path.join(getCacheDirPath(), `${encodedKey}.json`);
}
  