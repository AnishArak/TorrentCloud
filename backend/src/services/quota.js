import User from "../models/User.js";
import Download from "../models/Download.js";

export async function reserveStorage(userId, size) {
  if (!Number.isSafeInteger(size) || size < 0) {
    throw new Error("Download size is invalid");
  }
  if (size === 0) return true;

  const updated = await User.findOneAndUpdate(
    {
      _id: userId,
      $expr: {
        $lte: [
          { $add: [{ $ifNull: ["$storageUsed", 0] }, size] },
          "$storageLimit"
        ]
      }
    },
    { $inc: { storageUsed: size } },
    { returnDocument: "after" }
  );
  return Boolean(updated);
}

export async function releaseStorage(download) {
  const reserved = Number(download.reservedSize || 0);
  const released = await Download.findOneAndUpdate(
    { _id: download._id, storageReserved: true },
    { $set: { storageReserved: false } },
    { returnDocument: "after" }
  );
  if (!released || reserved <= 0) return;
  await User.updateOne(
    { _id: released.userId, storageUsed: { $gte: reserved } },
    { $inc: { storageUsed: -reserved } }
  );
  download.storageReserved = false;
}

export async function reserveForDownload(download, size) {
  const alreadyReserved = Number(download.reservedSize || 0);
  if (download.storageReserved && size <= alreadyReserved) return true;
  const additional = Math.max(0, size - alreadyReserved);
  const accepted = await reserveStorage(download.userId, additional);
  if (!accepted) return false;
  download.reservedSize = size;
  download.storageReserved = size > 0;
  await download.save();
  return true;
}

export async function rollbackStorage(userId, size) {
  if (size > 0) {
    await User.updateOne(
      { _id: userId, storageUsed: { $gte: size } },
      { $inc: { storageUsed: -size } }
    );
  }
}
