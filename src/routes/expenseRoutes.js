const express = require('express');
const router = express.Router();
const { getExpenses, saveExpense, deleteExpense } = require('../controllers/expenseController');
const { protect } = require('../middleware/auth');

router.route('/')
  .get(protect, getExpenses)
  .post(protect, saveExpense);

router.route('/:id')
  .delete(protect, deleteExpense);

module.exports = router;
