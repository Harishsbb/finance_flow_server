const mongoose = require('mongoose');

const BudgetSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: [true, 'Please add a category name'],
      trim: true,
    },
    limit: {
      type: Number,
      required: [true, 'Please add a budget limit'],
      min: [0, 'Limit cannot be negative'],
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

// Compound index to ensure unique combination of user, category, and income/expense status
BudgetSchema.index({ userId: 1, category: 1, isIncome: 1 }, { unique: true });

module.exports = mongoose.model('Budget', BudgetSchema);
