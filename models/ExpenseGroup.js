const mongoose = require('mongoose');

const expenseGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
      minlength: [1, 'Name must be at least 1 character'],
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    budget: {
      type: Number,
      default: 0,
      min: [0, 'Budget cannot be negative'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

expenseGroupSchema.index({ user: 1, name: 1 });

module.exports = mongoose.model('ExpenseGroup', expenseGroupSchema);
