const TYPES = [
  { extensions: [".mkv", ".mp4", ".avi", ".mov", ".webm"], type: "Video" },
  { extensions: [".mp3", ".flac", ".wav", ".m4a", ".ogg"], type: "Audio" },
  { extensions: [".pdf", ".epub", ".mobi", ".azw3"], type: "Documents" },
  { extensions: [".iso", ".img"], type: "Disk images" },
  { extensions: [".zip", ".rar", ".7z", ".tar", ".gz"], type: "Archives" },
  { extensions: [".jpg", ".jpeg", ".png", ".webp", ".gif"], type: "Images" }
];

export function analyzeDownload(download) {
  const files = download.files || [];
  const extensionCounts = new Map();
  const fileNames = [];
  for (const file of files) {
    if (typeof file.path !== "string") continue;
    fileNames.push(file.path.split(/[\\/]/).pop());
    const dot = file.path.lastIndexOf(".");
    if (dot === -1) continue;
    const extension = file.path.slice(dot).toLowerCase();
    extensionCounts.set(extension, (extensionCounts.get(extension) || 0) + 1);
  }

  const detectedTypes = TYPES
    .filter(({ extensions }) => extensions.some((extension) => extensionCounts.has(extension)))
    .map(({ type }) => type);
  const category = detectedTypes.length === 1 ? detectedTypes[0] :
    detectedTypes.length > 1 ? "Mixed media" : "Other";
  const fileTypes = [...extensionCounts.keys()].sort();
  const name = String(download.name || "Untitled torrent");
  const titleCategory = /linux|ubuntu|debian|fedora|\.iso\b/i.test(name) ? "Disk images" :
    /movie|film|season|episode/i.test(name) ? "Video" : undefined;
  const resolvedCategory = category === "Other" && titleCategory ? titleCategory : category;
  const directories = new Set(
    files.map((file) => typeof file.path === "string" ? file.path.split(/[\\/]/).slice(0, -1).join("/") : "")
      .filter(Boolean)
  );

  return {
    category: resolvedCategory,
    summary: `${name}: ${files.length} file${files.length === 1 ? "" : "s"} totaling ${Number(download.totalSize || 0)} bytes${directories.size ? ` across ${directories.size} director${directories.size === 1 ? "y" : "ies"}` : ""}.`,
    detectedFileTypes: fileTypes,
    fileNames: fileNames.slice(0, 100),
    confidence: files.length ? (fileTypes.length ? 0.8 : 0.55) : (titleCategory ? 0.45 : 0.2)
  };
}
