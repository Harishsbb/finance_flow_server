const mongoose = require('mongoose');

const BankAccountSchema = new mongoose.Schema(
  {
    // Storing string ID directly since the Flutter client generates UUIDs
    id: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: [true, 'Please add an account name'],
      trim: true,
    },
    balance: {
      type: Number,
      required: true,
      default: 0.0,
    },
    type: {
      type: Number, // 0: savings, 1: current, 2: wallet
      required: true,
      enum: [0, 1, 2],
      default: 0,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compounding index for querying user accounts
BankAccountSchema.index({ userId: 1, id: 1 }, { unique: true });

module.exports = mongoose.model('BankAccount', BankAccountSchema);
