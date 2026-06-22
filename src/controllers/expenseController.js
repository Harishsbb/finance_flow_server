const Expense = require('../models/Expense');
const BankAccount = require('../models/BankAccount');

// @desc    Get all expenses/transactions for current user (sorted by date descending)
// @route   GET /api/expenses
// @access  Private
const getExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({ userId: req.user.uid }).sort({ dateTime: -1 });
    res.status(200).json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add or Update (Upsert) an expense/transaction
// @route   POST /api/expenses
// @access  Private
const saveExpense = async (req, res) => {
  try {
    const { id, amount, category, dateTime, accountId, note, isIncome } = req.body;

    if (!id || !amount || !category || !dateTime || !accountId || isIncome === undefined) {
      return res.status(400).json({ message: 'Please provide all required fields (id, amount, category, dateTime, accountId, isIncome)' });
    }

    // 1. Revert previous balance impact if this is an update
    const oldExpense = await Expense.findOne({ id, userId: req.user.uid });
    if (oldExpense) {
      const oldAccount = await BankAccount.findOne({ id: oldExpense.accountId, userId: req.user.uid });
      if (oldAccount) {
        const revertAdjustment = oldExpense.isIncome ? -oldExpense.amount : oldExpense.amount;
        oldAccount.balance += revertAdjustment;
        await oldAccount.save();
      }
    }

    // 2. Apply new balance impact
    const newAccount = await BankAccount.findOne({ id: accountId, userId: req.user.uid });
    if (!newAccount) {
      return res.status(404).json({ message: `Associated Bank Account with ID ${accountId} not found` });
    }
    const applyAdjustment = isIncome ? amount : -amount;
    newAccount.balance += applyAdjustment;
    await newAccount.save();

    // 3. Save/Update the expense
    const expense = await Expense.findOneAndUpdate(
      { id, userId: req.user.uid },
      { id, amount, category, dateTime, accountId, note, isIncome, userId: req.user.uid },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json(expense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete an expense/transaction and revert the associated account balance
// @route   DELETE /api/expenses/:id
// @access  Private
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the expense first to know what account and amount to revert
    const expense = await Expense.findOne({ id, userId: req.user.uid });
    if (!expense) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Revert the balance on the associated bank account
    const account = await BankAccount.findOne({ id: expense.accountId, userId: req.user.uid });
    if (account) {
      // If it was income, subtract it. If it was an expense, add it back.
      const adjustment = expense.isIncome ? -expense.amount : expense.amount;
      account.balance += adjustment;
      await account.save();
    }

    // Delete the transaction document
    await Expense.deleteOne({ id, userId: req.user.uid });

    res.status(200).json({ message: 'Transaction deleted and balance reverted successfully', id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getExpenses,
  saveExpense,
  deleteExpense,
};
