export function getTorrentContentSize(buffer) {
  let offset = 0;

  function parse(depth = 0) {
    if (depth > 100 || offset >= buffer.length) {
      throw new Error("Invalid or excessively nested torrent metadata");
    }

    const marker = buffer[offset++];
    if (marker === 0x69) {
      const end = buffer.indexOf(0x65, offset);
      if (end === -1) throw new Error("Invalid torrent integer");
      const text = buffer.toString("ascii", offset, end);
      if (!/^(0|-?[1-9]\d*)$/.test(text)) throw new Error("Invalid torrent integer");
      offset = end + 1;
      return BigInt(text);
    }

    if (marker >= 0x30 && marker <= 0x39) {
      const colon = buffer.indexOf(0x3a, offset);
      if (colon === -1) throw new Error("Invalid torrent string");
      const lengthText = String.fromCharCode(marker) + buffer.toString("ascii", offset, colon);
      if (!/^(0|[1-9]\d*)$/.test(lengthText)) throw new Error("Invalid torrent string length");
      const length = Number(lengthText);
      offset = colon + 1;
      if (!Number.isSafeInteger(length) || length > buffer.length - offset) {
        throw new Error("Invalid torrent string length");
      }
      const value = buffer.subarray(offset, offset + length);
      offset += length;
      return value;
    }

    if (marker === 0x6c) {
      const values = [];
      while (offset < buffer.length && buffer[offset] !== 0x65) {
        values.push(parse(depth + 1));
      }
      if (buffer[offset++] !== 0x65) throw new Error("Invalid torrent list");
      return values;
    }

    if (marker === 0x64) {
      const values = new Map();
      while (offset < buffer.length && buffer[offset] !== 0x65) {
        const key = parse(depth + 1);
        if (!Buffer.isBuffer(key)) throw new Error("Invalid torrent dictionary key");
        const value = parse(depth + 1);
        values.set(key.toString("utf8"), value);
      }
      if (buffer[offset++] !== 0x65) throw new Error("Invalid torrent dictionary");
      return values;
    }

    throw new Error("Invalid torrent metadata");
  }

  const root = parse();
  if (offset !== buffer.length || !(root instanceof Map)) {
    throw new Error("Invalid torrent metadata");
  }
  const info = root.get("info");
  if (!(info instanceof Map)) throw new Error("Torrent metadata has no info dictionary");

  let size = 0n;
  const files = info.get("files");
  if (Array.isArray(files)) {
    for (const file of files) {
      const length = file instanceof Map ? file.get("length") : undefined;
      if (typeof length !== "bigint" || length < 0n) {
        throw new Error("Torrent metadata contains an invalid file size");
      }
      size += length;
    }
  } else if (typeof info.get("length") === "bigint") {
    size = info.get("length");
    if (size < 0n) throw new Error("Torrent metadata contains an invalid file size");
  } else {
    const fileTree = info.get("file tree");
    if (!(fileTree instanceof Map)) {
      throw new Error("Torrent metadata contains no valid content size");
    }

    function addTreeSizes(tree) {
      for (const [name, value] of tree) {
        if (!(value instanceof Map)) {
          throw new Error("Torrent metadata contains an invalid file tree");
        }
        if (name === "") {
          const length = value.get("length");
          if (typeof length !== "bigint" || length < 0n) {
            throw new Error("Torrent metadata contains an invalid file size");
          }
          size += length;
        } else {
          addTreeSizes(value);
        }
      }
    }
    addTreeSizes(fileTree);
  }

  if (size > BigInt(Number.MAX_SAFE_INTEGER)) {
    return Number.MAX_SAFE_INTEGER;
  }
  return Number(size);
}
