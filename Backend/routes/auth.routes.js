const express = require('express');
const { body } = require('express-validator');
const { signup, signin } = require('../controllers/auth.controller');
const validate = require('../validators/auth.validators');

const router = express.Router();

router.post(
  '/signup',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  ],
  validate,
  signup
);

router.post(
  '/signin',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  signin
);

module.exports = router;
