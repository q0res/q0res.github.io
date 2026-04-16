const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Storage configuration for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = uuidv4() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// In-memory storage for video metadata (in production, use a database)
let videos = [];
const ADMIN_KEY = '121212qore121212454566';

// Middleware to check admin status
const checkAdmin = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];
  req.isAdmin = adminKey === ADMIN_KEY;
  next();
};

app.use(checkAdmin);

// Routes
app.get('/api/videos', (req, res) => {
  // Only return videos to admin users
  if (req.isAdmin) {
    res.json(videos);
  } else {
    res.json([]);
  }
});

app.post('/api/videos', upload.single('video'), (req, res) => {
  // Only allow admin to upload
  if (!req.isAdmin) {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  
  const { title, description } = req.body;
  const video = {
    id: uuidv4(),
    title,
    description,
    filename: req.file.filename,
    url: `/uploads/${req.file.filename}`,
    uploadDate: new Date().toISOString(),
    ownerId: 'admin'
  };
  videos.push(video);
  res.json(video);
});

app.delete('/api/videos/:id', (req, res) => {
  // Only allow admin to delete
  if (!req.isAdmin) {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  
  const { id } = req.params;
  const index = videos.findIndex(v => v.id === id);
  if (index !== -1) {
    const video = videos[index];
    fs.unlinkSync(path.join('uploads', video.filename));
    videos.splice(index, 1);
    res.json({ message: 'Video deleted' });
  } else {
    res.status(404).json({ message: 'Video not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});