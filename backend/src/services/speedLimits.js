import {
  ALLOW_UNLIMITED_DOWNLOAD_SPEED,
  DEFAULT_MAX_DOWNLOAD_SPEED,
  formatAriaSpeed,
  MAX_ALLOWED_DOWNLOAD_SPEED
} from "../config.js";

const MEGABYTE = 1024 ** 2;

export function resolveSpeedLimit(value) {
  if (value === "unlimited" || value === null) {
    if (!ALLOW_UNLIMITED_DOWNLOAD_SPEED) {
      throw Object.assign(new Error("Unlimited speed is disabled by the server."), { status: 400 });
    }
    return null;
  }

  const megabytes = typeof value === "number" ? value : Number(value);
  if (![1, 2, 5, 10, 20, 50, 100].includes(megabytes)) {
    throw Object.assign(new Error("Choose a supported speed limit."), { status: 400 });
  }
  const bytesPerSecond = megabytes * MEGABYTE;
  if (MAX_ALLOWED_DOWNLOAD_SPEED !== null && bytesPerSecond > MAX_ALLOWED_DOWNLOAD_SPEED) {
    throw Object.assign(new Error("That speed limit exceeds the server maximum."), { status: 400 });
  }
  return bytesPerSecond;
}

export function ariaSpeedOption(bytesPerSecond) {
  return formatAriaSpeed(bytesPerSecond === undefined ? DEFAULT_MAX_DOWNLOAD_SPEED : bytesPerSecond);
}

export function publicSpeedLimit(bytesPerSecond) {
  return bytesPerSecond === null ? "unlimited" : bytesPerSecond;
}
