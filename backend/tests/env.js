const os = require('os');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-hs256-0123456789';
process.env.UPLOAD_DIR = path.join(os.tmpdir(), 'campusfind-test-uploads');
process.env.OAUTH_REDIRECT_URIS = 'http://localhost:5173/callback';
