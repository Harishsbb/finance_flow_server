const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    uid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    displayName: {
      type: String,
      trim: true,
      default: '',
    },
    photoBuffer: {
      type: Buffer,
      default: null,
    },
    photoMimeType: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', UserSchema);
