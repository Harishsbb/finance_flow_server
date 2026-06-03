const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK if key file exists and Auth is enabled
let firebaseInitialized = false;

if (process.env.FIREBASE_AUTH_DISABLED !== 'true') {
  const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
  if (fs.existsSync(serviceAccountPath)) {
    try {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      firebaseInitialized = true;
      console.log('Firebase Admin SDK initialized successfully.');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error.message);
    }
  } else {
    console.warn(
      'WARNING: FIREBASE_AUTH_DISABLED is false, but serviceAccountKey.json is missing! Auth will fail.'
    );
  }
} else {
  console.log('Running in Development Mode: Firebase Authentication is bypassed.');
}

const protect = async (req, res, next) => {
  try {
    let token;

    // Check for authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Bypass mode for local development/testing
    if (process.env.FIREBASE_AUTH_DISABLED === 'true') {
      // Allow passing uid via standard 'x-user-id' header or auth header directly
      const uid = req.headers['x-user-id'] || token || 'dev_user_123';
      req.user = { uid };
      return next();
    }

    // Strict Mode: Verify Firebase Token
    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token provided' });
    }

    if (!firebaseInitialized) {
      return res.status(500).json({
        message: 'Server Configuration Error: Firebase authentication service not active.',
      });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = { uid: decodedToken.uid };
    next();
  } catch (error) {
    console.error('Authentication Error:', error.message);
    res.status(401).json({ message: 'Not authorized, token verification failed' });
  }
};

module.exports = { protect };
