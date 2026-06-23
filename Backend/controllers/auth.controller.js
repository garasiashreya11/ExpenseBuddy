const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

exports.signup = async (req, res, next) => {
  try {
    const { name, email, password, firstName: fn, lastName: ln, phone = '' } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    // Derive first/last from name if not provided
    let firstName = (fn || '').trim();
    let lastName = (ln || '').trim();
    if (!firstName && name) {
      const parts = String(name).trim().split(/\s+/);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }
    const displayName = [firstName, lastName].filter(Boolean).join(' ') || name;

    const user = await User.create({
      name: displayName,
      firstName,
      lastName,
      phone: String(phone || '').trim(),
      email,
      password: hashed,
    });

    const token = signToken(user._id);
    res.status(201).json({
      token,
      user: { _id: user._id, name: user.name, email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone },
    });
  } catch (err) {
    next(err);
  }
};

exports.signin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user._id);
    res.json({
      token,
      user: { _id: user._id, name: user.name, email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone },
    });
  } catch (err) {
    next(err);
  }
};
