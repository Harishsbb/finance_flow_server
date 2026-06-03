const Budget = require('../models/Budget');

// @desc    Get all budgets for current user
// @route   GET /api/budgets
// @access  Private
const getBudgets = async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.user.uid });
    res.status(200).json(budgets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Set (Upsert) budget by category & isIncome
// @route   POST /api/budgets
// @access  Private
const setBudget = async (req, res) => {
  try {
    const { category, limit, isIncome } = req.body;

    if (!category || limit === undefined || isIncome === undefined) {
      return res.status(400).json({ message: 'Please provide category, limit, and isIncome' });
    }

    // Upsert budget based on userId, category, and isIncome
    const budget = await Budget.findOneAndUpdate(
      { userId: req.user.uid, category, isIncome },
      { limit },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.status(200).json(budget);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getBudgets,
  setBudget,
};
