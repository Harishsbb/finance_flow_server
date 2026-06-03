const express = require('express');
const router = express.Router();
const { getBudgets, setBudget } = require('../controllers/budgetController');
const { protect } = require('../middleware/auth');

router.route('/')
  .get(protect, getBudgets)
  .post(protect, setBudget);

module.exports = router;
