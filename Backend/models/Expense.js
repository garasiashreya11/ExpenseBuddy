const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ['income', 'expense'], default: 'expense' },
    status: { type: String, enum: ['Paid', 'Pending'], default: 'Paid' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);
