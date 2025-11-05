import { UploadedFile } from '../models/index.js';

export async function listFiles(req, res) {
  try {
    const files = await UploadedFile.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
    });
    res.json(files);
  } catch (err) {
    console.error('❌ Error listing files:', err);
    res.status(500).json({ message: 'Failed to list uploaded files' });
  }
}
