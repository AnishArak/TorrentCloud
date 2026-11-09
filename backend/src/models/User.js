import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254
    },
    passwordHash: { type: String, required: true, select: false },
    storageLimit: { type: Number, required: true },
    storageUsed: { type: Number, default: 0, min: 0 },
    maxDownloadSpeed: { type: Number, required: true }
  },
  { timestamps: true }
);

export default mongoose.model("User", schema);
