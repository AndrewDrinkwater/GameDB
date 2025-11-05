import multer from 'multer';
import path from 'path';
import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import {
  createEntity,
  createEntitySecret,
  deleteEntity,
  getEntityById,
  getEntitySecrets,
  searchEntities,
  updateEntity,
} from '../controllers/entityController.js';
import { getEntityGraph } from '../controllers/entityGraphController.js';

const router = Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Files will be stored in the 'uploads' folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Add timestamp to avoid name conflicts
  },
});

const upload = multer({ storage });

// Authenticated routes
router.use(authenticate);

// File upload route (POST) for bulk entity creation from a file
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  console.log('File uploaded successfully:', req.file);
  return res.status(200).send('File uploaded successfully!');
});

// Entity-related routes
router.get('/:id/graph', getEntityGraph);
router.post('/', createEntity);
router.get('/search', searchEntities);
router.get('/:id', getEntityById);
router.patch('/:id', updateEntity);
router.delete('/:id', deleteEntity);
router.get('/:id/secrets', getEntitySecrets);
router.post('/:id/secrets', createEntitySecret);

export default router;
