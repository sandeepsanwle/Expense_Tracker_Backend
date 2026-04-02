const { validationResult } = require('express-validator');
const ExpenseGroup = require('../models/ExpenseGroup');
const Expense = require('../models/Expense');

const getGroups = async (req, res) => {
  try {
    const groups = await ExpenseGroup.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    const ids = groups.map((g) => g._id);
    let spentByGroup = [];
    if (ids.length > 0) {
      spentByGroup = await Expense.aggregate([
        {
          $match: {
            user: req.user._id,
            group: { $in: ids },
          },
        },
        {
          $group: {
            _id: '$group',
            spent: { $sum: '$amount' },
            expenseCount: { $sum: 1 },
          },
        },
      ]);
    }

    const spentMap = new Map(
      spentByGroup.map((s) => [s._id.toString(), s])
    );

    const data = groups.map((g) => {
      const agg = spentMap.get(g._id.toString());
      const spent = agg ? agg.spent : 0;
      const expenseCount = agg ? agg.expenseCount : 0;
      const remaining = g.budget - spent;
      return {
        ...g.toObject(),
        spent,
        expenseCount,
        remaining,
      };
    });

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching groups',
      error: error.message,
    });
  }
};

const createGroup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, budget } = req.body;
    const budgetNum =
      budget === undefined || budget === null || budget === ''
        ? 0
        : Number(budget);

    const group = await ExpenseGroup.create({
      name: name.trim(),
      budget: budgetNum,
      user: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: {
        ...group.toObject(),
        spent: 0,
        expenseCount: 0,
        remaining: group.budget,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating group',
      error: error.message,
    });
  }
};

const updateGroup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const group = await ExpenseGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }
    if (group.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { name, budget } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (budget !== undefined && budget !== null && budget !== '') {
      updates.budget = Number(budget);
    }

    const updated = await ExpenseGroup.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    const agg = await Expense.aggregate([
      {
        $match: { user: req.user._id, group: updated._id },
      },
      {
        $group: {
          _id: '$group',
          spent: { $sum: '$amount' },
          expenseCount: { $sum: 1 },
        },
      },
    ]);
    const spent = agg[0]?.spent || 0;
    const expenseCount = agg[0]?.expenseCount || 0;

    res.status(200).json({
      success: true,
      data: {
        ...updated.toObject(),
        spent,
        expenseCount,
        remaining: updated.budget - spent,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating group',
      error: error.message,
    });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const group = await ExpenseGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }
    if (group.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const deleteResult = await Expense.deleteMany({
      user: req.user._id,
      group: group._id,
    });
    await ExpenseGroup.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Budget deleted',
      deletedExpenseCount: deleteResult.deletedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting group',
      error: error.message,
    });
  }
};

module.exports = {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
};
