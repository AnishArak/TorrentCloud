import path from "path";

function readPositiveInteger(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive safe integer`);
  }
  return value;
}

export const MAX_TORRENT_FILE_SIZE = readPositiveInteger(
  "MAX_TORRENT_FILE_SIZE",
  104857600
);
export const MAX_DOWNLOAD_SIZE = readPositiveInteger(
  "MAX_DOWNLOAD_SIZE",
  5368709120
);
export const DOWNLOAD_ROOT = path.resolve(process.env.DOWNLOAD_DIR || "../downloads");
export const ARIA2_DOWNLOAD_ROOT = process.env.ARIA2_DOWNLOAD_DIR || "/downloads";
export const DEFAULT_STORAGE_LIMIT = readPositiveInteger(
  "DEFAULT_STORAGE_LIMIT",
  10737418240
);
export const DEFAULT_MAX_DOWNLOAD_SPEED = readSpeedLimit(
  "DEFAULT_MAX_DOWNLOAD_SPEED",
  "100M"
);
export const MAX_ALLOWED_DOWNLOAD_SPEED = readSpeedLimit(
  "MAX_ALLOWED_DOWNLOAD_SPEED",
  "100M"
);
export const MAX_GLOBAL_DOWNLOAD_SPEED = readSpeedLimit(
  "MAX_GLOBAL_DOWNLOAD_SPEED",
  "500M"
);
export const ARIA2_BT_REQUEST_PEER_SPEED_LIMIT = readSpeedLimit(
  "ARIA2_BT_REQUEST_PEER_SPEED_LIMIT",
  "50K"
);
export const ALLOW_UNLIMITED_DOWNLOAD_SPEED =
  process.env.ALLOW_UNLIMITED_DOWNLOAD_SPEED === "true";

function readSpeedLimit(name, fallback) {
  const value = process.env[name] || fallback;
  if (value === "unlimited" && name === "MAX_ALLOWED_DOWNLOAD_SPEED") {
    return null;
  }
  const match = /^(\d+)(K|M|G)?$/i.exec(value);
  if (!match) {
    throw new Error(`${name} must be a positive number with optional K, M, or G suffix`);
  }
  const multipliers = { K: 1024, M: 1024 ** 2, G: 1024 ** 3 };
  const result = Number(match[1]) * multipliers[(match[2] || "").toUpperCase()];
  if (!Number.isSafeInteger(result) || result <= 0) {
    throw new Error(`${name} must be a positive safe byte-per-second limit`);
  }
  return result;
}

if (DEFAULT_MAX_DOWNLOAD_SPEED > (MAX_ALLOWED_DOWNLOAD_SPEED ?? Infinity)) {
  throw new Error("DEFAULT_MAX_DOWNLOAD_SPEED cannot exceed MAX_ALLOWED_DOWNLOAD_SPEED");
}

export function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${formatted} ${units[unit]}`;
}

export function formatAriaSpeed(bytesPerSecond) {
  if (bytesPerSecond === null) return "0";
  if (bytesPerSecond % (1024 ** 2) === 0) return `${bytesPerSecond / (1024 ** 2)}M`;
  if (bytesPerSecond % 1024 === 0) return `${bytesPerSecond / 1024}K`;
  return String(bytesPerSecond);
}
