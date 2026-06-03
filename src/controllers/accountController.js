const BankAccount = require('../models/BankAccount');

// @desc    Get all accounts for current user
// @route   GET /api/accounts
// @access  Private
const getAccounts = async (req, res) => {
  try {
    const accounts = await BankAccount.find({ userId: req.user.uid });
    res.status(200).json(accounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add or Update (Upsert) an account
// @route   POST /api/accounts
// @access  Private
const saveAccount = async (req, res) => {
  try {
    const { id, name, balance, type } = req.body;

    if (!id || !name || balance === undefined || type === undefined) {
      return res.status(400).json({ message: 'Please provide all required fields (id, name, balance, type)' });
    }

    // Upsert behavior: update if exists (by custom id and userId), insert if not
    const account = await BankAccount.findOneAndUpdate(
      { id, userId: req.user.uid },
      { id, name, balance, type, userId: req.user.uid },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json(account);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete an account
// @route   DELETE /api/accounts/:id
// @access  Private
const deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const account = await BankAccount.findOneAndDelete({
      id,
      userId: req.user.uid,
    });

    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.status(200).json({ message: 'Account deleted successfully', id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAccounts,
  saveAccount,
  deleteAccount,
};
