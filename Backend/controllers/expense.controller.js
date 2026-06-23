const Expense = require('../models/Expense');

// Create an expense
exports.createExpense = async (req, res, next) => {
  try {
    const { date, category, description, amount, status } = req.body;
    const userId = req.user.id; // from auth middleware

    const expense = await Expense.create({
      userId,
      date,
      category,
      description,
      amount,
      status,
    });

    res.status(201).json(expense);
  } catch (err) {
    next(err);
  }
};

// Get expenses for logged-in user with optional filters
exports.getExpenses = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { from, to, category, status } = req.query;
    const filter = { userId };

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    if (category) filter.category = category;
    if (status) filter.status = status;

    const expenses = await Expense.find(filter).sort({ date: -1, createdAt: -1 });
    res.json(expenses);
  } catch (err) {
    next(err);
  }
};
