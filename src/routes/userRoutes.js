const express = require('express');
const router = express.Router();
const { uploadProfilePhoto, getProfilePhoto, updateProfile } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

// Public endpoint to view/fetch user profile picture
router.get('/profile-photo/:uid', getProfilePhoto);

// Protected endpoint to upload photo (limit 10MB, parses raw image body)
router.post(
  '/profile-photo',
  protect,
  express.raw({ type: 'image/*', limit: '10mb' }),
  uploadProfilePhoto
);

// Protected endpoint to update text profile info (like displayName)
router.post('/profile', protect, updateProfile);

module.exports = router;
