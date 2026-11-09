import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { ARIA2_DOWNLOAD_ROOT, DOWNLOAD_ROOT } from "../config.js";

export function createStoragePath() {
  return path.join(DOWNLOAD_ROOT, crypto.randomUUID());
}

export function resolveStoragePath(storagePath) {
  if (typeof storagePath !== "string") {
    throw new Error("Invalid download storage path");
  }

  const resolved = path.resolve(storagePath);
  if (path.dirname(resolved) !== DOWNLOAD_ROOT) {
    throw new Error("Invalid download storage path");
  }
  return resolved;
}

export function getAria2StoragePath(storagePath) {
  const resolved = resolveStoragePath(storagePath);
  return path.posix.join(ARIA2_DOWNLOAD_ROOT.replace(/\\/g, "/"), path.basename(resolved));
}

export function mapAria2Files(files, aria2Directory) {
  const normalizedRoot = path.posix.normalize(aria2Directory);
  const prefix = `${normalizedRoot}/`;
  return (files || []).flatMap((file) => {
    if (typeof file.path !== "string") return [];
    const remotePath = path.posix.normalize(file.path);
    if (!remotePath.startsWith(prefix)) return [];
    const relativePath = path.posix.relative(normalizedRoot, remotePath);
    if (!relativePath || relativePath.startsWith("..") || path.posix.isAbsolute(relativePath)) {
      return [];
    }
    return [{ ...file, path: relativePath }];
  });
}

export async function resolveDownloadFile(storagePath, filePath) {
  const root = resolveStoragePath(storagePath);
  const candidate = path.isAbsolute(filePath)
    ? path.resolve(filePath)
    : path.resolve(root, filePath);
  const relative = path.relative(root, candidate);

  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Invalid download file path");
  }

  const realRoot = await fs.realpath(root);
  const realFile = await fs.realpath(candidate);
  const realRelative = path.relative(realRoot, realFile);
  if (!realRelative || realRelative.startsWith("..") || path.isAbsolute(realRelative)) {
    throw new Error("Invalid download file path");
  }

  const info = await fs.stat(realFile);
  if (!info.isFile()) {
    throw new Error("Download path is not a file");
  }
  return realFile;
}
