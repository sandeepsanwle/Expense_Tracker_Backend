const express = require('express');
const { body } = require('express-validator');
const {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
} = require('../controllers/groupController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getGroups);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('budget')
      .optional()
      .isNumeric()
      .withMessage('Budget must be a number')
      .custom((v) => Number(v) >= 0)
      .withMessage('Budget cannot be negative'),
  ],
  createGroup
);

router.put(
  '/:id',
  [
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Name cannot be empty'),
    body('budget')
      .optional()
      .isNumeric()
      .withMessage('Budget must be a number')
      .custom((v) => Number(v) >= 0)
      .withMessage('Budget cannot be negative'),
  ],
  updateGroup
);

router.delete('/:id', deleteGroup);

module.exports = router;
