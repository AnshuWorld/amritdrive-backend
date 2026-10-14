const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const { validationResult } = require('express-validator');
const {
  allowedOrigins,
  pickValidOrigin,
} = require('../config/clientOrigins');

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

const base64UrlEncode = (input) => {
  return Buffer.from(JSON.stringify(input))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const base64UrlDecode = (input) => {
  if (!input) return null;
  try {
    const padded = input.replace(/-/g, '+').replace(/_/g, '/');
    const buffer = Buffer.from(padded, 'base64');
    return JSON.parse(buffer.toString());
  } catch (error) {
    console.warn('Failed to decode OAuth state:', error.message);
    return null;
  }
};

const sanitizeRedirectOrigin = (origin) => {
  if (!origin) return null;
  const normalized = origin.replace(/\/$/, '');
  return allowedOrigins.includes(normalized) ? normalized : null;
};

const resolveRedirectOrigin = (req) => {
  const stateData = base64UrlDecode(req.query.state);
  if (stateData?.redirect) {
    const origin = sanitizeRedirectOrigin(stateData.redirect);
    if (origin) {
      return origin;
    }
  }
  return pickValidOrigin();
};

// Register user
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    user = new User({
      name,
      email,
      password
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    // This is the new part that adds the storage info
    const storageInfo = {
        storageUsed: user.storageUsed,
        storageLimit: user.storageLimit,
    };

    // Send back the user object with the nested storageInfo
    res.json({ 
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            storageInfo: storageInfo, // Add this line
        }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// Logout user
exports.logout = async (req, res) => {
  try {
    // In a real application, you might want to blacklist the token
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Google OAuth initialization
exports.googleAuth = (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    const redirectOrigin = resolveRedirectOrigin(req);
    return res.redirect(`${redirectOrigin}/login?error=oauth_not_configured`);
  }

  const redirect = req.query.redirect;
  const stateData = redirect ? { redirect } : {};
  const state = base64UrlEncode(stateData);

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: state
  })(req, res, next);
};

// Google OAuth callback
exports.googleAuthCallback = (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user, info) => {
    const redirectOrigin = resolveRedirectOrigin(req);
    
    if (err) {
      console.error('Google auth error:', err);
      return res.redirect(`${redirectOrigin}/login?error=auth_failed`);
    }
    
    if (!user) {
      return res.redirect(`${redirectOrigin}/login?error=user_not_found`);
    }

    try {
      const token = generateToken(user._id);
      // Redirect to the client with the token
      res.redirect(`${redirectOrigin}/auth-success?token=${token}`);
    } catch (error) {
      console.error('Token generation error:', error);
      res.redirect(`${redirectOrigin}/login?error=token_generation_failed`);
    }
  })(req, res, next);
};