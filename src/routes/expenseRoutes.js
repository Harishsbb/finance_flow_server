const express = require('express');
const router = express.Router();
const { getExpenses, saveExpense, deleteExpense, exportExpenses } = require('../controllers/expenseController');
const { protect } = require('../middleware/auth');

router.route('/export')
  .get(protect, exportExpenses);

router.route('/')
  .get(protect, getExpenses)
  .post(protect, saveExpense);

router.route('/:id')
  .delete(protect, deleteExpense);

module.exports = router;
