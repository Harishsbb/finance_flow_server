const User = require('../models/User');

// @desc    Upload profile photo (receives raw image bytes)
// @route   POST /api/users/profile-photo
// @access  Private
const uploadProfilePhoto = async (req, res) => {
  try {
    const uid = req.user.uid;
    const contentType = req.headers['content-type'] || 'image/jpeg';
    
    if (!req.body || !Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ message: 'No image data received.' });
    }

    // Find user and save binary photo
    let user = await User.findOne({ uid });
    if (!user) {
      user = new User({ uid });
    }

    user.photoBuffer = req.body;
    user.photoMimeType = contentType;
    await user.save();

    // Construct the public retrieval URL for this photo
    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    // Add timestamp to prevent browser cache issues on the client side
    const photoUrl = `${protocol}://${host}/api/users/profile-photo/${uid}?t=${Date.now()}`;

    res.status(200).json({
      message: 'Photo uploaded and saved to MongoDB successfully',
      photoUrl,
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get profile photo as a binary file stream
// @route   GET /api/users/profile-photo/:uid
// @access  Public
const getProfilePhoto = async (req, res) => {
  try {
    const { uid } = req.params;

    const user = await User.findOne({ uid });
    if (!user || !user.photoBuffer) {
      return res.status(404).json({ message: 'Profile photo not found' });
    }

    // Set correct headers and send the raw image buffer
    res.set('Content-Type', user.photoMimeType || 'image/jpeg');
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(user.photoBuffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile display name
// @route   POST /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { displayName } = req.body;

    let user = await User.findOne({ uid });
    if (!user) {
      user = new User({ uid });
    }

    user.displayName = displayName || '';
    await user.save();

    res.status(200).json({
      message: 'Profile updated successfully',
      displayName: user.displayName,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  uploadProfilePhoto,
  getProfilePhoto,
  updateProfile,
};
