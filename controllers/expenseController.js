const { validationResult } = require('express-validator');
const Expense = require('../models/Expense');

// @desc    Create a new expense
// @route   POST /api/expenses
const createExpense = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { title, amount, date } = req.body;

    const expense = await Expense.create({
      title,
      amount,
      date: date || Date.now(),
      user: req.user._id,
    });

    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating expense',
      error: error.message,
    });
  }
};

// @desc    Get expenses filtered by month/year
// @route   GET /api/expenses?month=3&year=2026
const getExpenses = async (req, res) => {
  try {
    const { month, year } = req.query;

    let query = { user: req.user._id };

    // If month and year are provided, filter by date range
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    } else if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const expenses = await Expense.find(query).sort({ date: -1 });

    // Calculate total amount
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    res.status(200).json({
      success: true,
      count: expenses.length,
      total,
      data: expenses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching expenses',
      error: error.message,
    });
  }
};

// @desc    Get monthly analytics for a year (totals per month)
// @route   GET /api/expenses/analytics?year=2026
const getAnalytics = async (req, res) => {
  try {
    const { year } = req.query;

    if (!year) {
      return res.status(400).json({
        success: false,
        message: 'Year is required for analytics',
      });
    }

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

    // Aggregate expenses grouped by month
    const analytics = await Expense.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $month: '$date' },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Build a full 12-month array with zeros for empty months
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    const monthlyData = months.map((label, index) => {
      const found = analytics.find((a) => a._id === index + 1);
      return {
        month: index + 1,
        label,
        total: found ? found.total : 0,
        count: found ? found.count : 0,
      };
    });

    const yearTotal = monthlyData.reduce((sum, m) => sum + m.total, 0);

    res.status(200).json({
      success: true,
      year: parseInt(year),
      yearTotal,
      data: monthlyData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message,
    });
  }
};

// @desc    Update an expense
// @route   PUT /api/expenses/:id
const updateExpense = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    let expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    // Ensure user owns this expense
    if (expense.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this expense',
      });
    }

    expense = await Expense.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating expense',
      error: error.message,
    });
  }
};

// @desc    Delete an expense
// @route   DELETE /api/expenses/:id
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    if (expense.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this expense',
      });
    }

    await Expense.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Expense deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting expense',
      error: error.message,
    });
  }
};

module.exports = {
  createExpense,
  getExpenses,
  getAnalytics,
  updateExpense,
  deleteExpense,
};
