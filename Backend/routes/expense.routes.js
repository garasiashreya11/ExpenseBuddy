const express = require('express');
const { body, query } = require('express-validator');
const auth = require('../middleware/auth');
const validate = require('../validators/auth.validators');
const { createExpense, getExpenses } = require('../controllers/expense.controller');

const router = express.Router();

// Protected routes
router.post(
  '/',
  auth,
  [
    body('date').notEmpty().withMessage('date is required'),
    body('category').notEmpty().withMessage('category is required'),
    body('amount').isFloat({ min: 0 }).withMessage('amount must be >= 0'),
  ],
  validate,
  createExpense
);

router.get(
  '/',
  auth,
  [
    query('from').optional().isISO8601().withMessage('from must be a date'),
    query('to').optional().isISO8601().withMessage('to must be a date'),
    query('category').optional().isString(),
    query('status').optional().isString(),
  ],
  validate,
  getExpenses
);

module.exports = router;
