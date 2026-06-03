const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema(
  {
    // Storing string ID directly since the Flutter client generates UUIDs
    id: {
      type: String,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: [true, 'Please add an amount'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    category: {
      type: String,
      required: [true, 'Please add a category'],
      trim: true,
    },
    dateTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    accountId: {
      type: String, // Maps to BankAccount's 'id' field
      required: true,
    },
    note: {
      type: String,
      trim: true,
      default: null,
    },
    isIncome: {
      type: Boolean,
      required: true,
      default: false,
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

// Compound index for querying user expenses and sorting by dateTime
ExpenseSchema.index({ userId: 1, dateTime: -1 });

module.exports = mongoose.model('Expense', ExpenseSchema);
