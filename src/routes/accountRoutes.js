const express = require('express');
const router = express.Router();
const { getAccounts, saveAccount, deleteAccount } = require('../controllers/accountController');
const { protect } = require('../middleware/auth');

router.route('/')
  .get(protect, getAccounts)
  .post(protect, saveAccount);

router.route('/:id')
  .delete(protect, deleteAccount);

module.exports = router;
