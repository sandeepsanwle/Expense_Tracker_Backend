const express = require('express');
const mongoose = require('mongoose');
const { body } = require('express-validator');
const {
  createExpense,
  getExpenses,
  getAnalytics,
  updateExpense,
  deleteExpense,
} = require('../controllers/expenseController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All expense routes require authentication
router.use(protect);

// Analytics route (must be before /:id to avoid conflict)
router.get('/analytics', getAnalytics);

router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('amount')
      .isNumeric()
      .withMessage('Amount must be a number')
      .custom((value) => value > 0)
      .withMessage('Amount must be greater than 0'),
    body('group')
      .optional({ nullable: true })
      .custom((value) => {
        if (value === null || value === undefined || value === '') return true;
        return mongoose.Types.ObjectId.isValid(value);
      })
      .withMessage('Invalid group id'),
  ],
  createExpense
);

router.get('/', getExpenses);

router.put(
  '/:id',
  [
    body('title')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Title cannot be empty'),
    body('amount')
      .optional()
      .isNumeric()
      .withMessage('Amount must be a number')
      .custom((value) => value > 0)
      .withMessage('Amount must be greater than 0'),
    body('group')
      .optional({ nullable: true })
      .custom((value) => {
        if (value === null || value === undefined || value === '') return true;
        return mongoose.Types.ObjectId.isValid(value);
      })
      .withMessage('Invalid group id'),
  ],
  updateExpense
);

router.delete('/:id', deleteExpense);

module.exports = router;
