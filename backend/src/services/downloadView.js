export function serializeDownload(download) {
  const value = typeof download.toObject === "function" ? download.toObject() : { ...download };
  delete value.storagePath;
  delete value.__v;
  return value;
}
