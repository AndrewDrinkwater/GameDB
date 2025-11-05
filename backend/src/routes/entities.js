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
import { UploadedFile } from '../models/index.js';

const router = Router();

// -------------------------------------------
// Multer configuration for local file uploads
// -------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Folder must exist at project root
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// -------------------------------------------
// Authenticated routes
// -------------------------------------------
router.use(authenticate);

// -------------------------------------------------------------
// POST /api/entities/upload → Upload a file + save metadata
// -------------------------------------------------------------
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    // Save file metadata to DB
    const savedFile = await UploadedFile.create({
      user_id: req.user.id,
      entity_id: req.body.entityId || null,
      file_name: req.file.originalname,
      file_path: `/uploads/${req.file.filename}`,
      mime_type: req.file.mimetype,
      size_bytes: req.file.size,
    });

    console.log('✅ File uploaded:', savedFile.file_name);

    return res.status(200).json({
      success: true,
      message: 'File uploaded successfully!',
      file: savedFile,
    });
  } catch (err) {
    console.error('❌ Upload failed:', err);
    return res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: err.message,
    });
  }
});

// -------------------------------------------------------------
// GET /api/entities/upload → List files uploaded by user
// -------------------------------------------------------------
router.get('/upload', async (req, res) => {
  try {
    const files = await UploadedFile.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
    });

    return res.status(200).json({ success: true, files });
  } catch (err) {
    console.error('❌ Failed to list files:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve uploaded files',
      error: err.message,
    });
  }
});

// -------------------------------------------
// Entity-related routes
// -------------------------------------------
router.get('/:id/graph', getEntityGraph);
router.post('/', createEntity);
router.get('/search', searchEntities);
router.get('/:id', getEntityById);
router.patch('/:id', updateEntity);
router.delete('/:id', deleteEntity);
router.get('/:id/secrets', getEntitySecrets);
router.post('/:id/secrets', createEntitySecret);

export default router;
