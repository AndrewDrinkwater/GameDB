import fs from 'fs'
import path from 'path'
import multer from 'multer'
import XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import {
  createEntity,
  createEntitySecret,
  deleteEntity,
  getEntityById,
  getEntitySecrets,
  searchEntities,
  updateEntity,
} from '../controllers/entityController.js'
import { getEntityGraph } from '../controllers/entityGraphController.js'
import { UploadedFile, EntityType, EntityTypeField } from '../models/index.js'

const router = Router()

// Ensure uploads directory exists
const uploadDir = path.resolve('uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`)
})
const upload = multer({ storage })

router.use(authenticate)

// File upload route
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' })
    const savedFile = await UploadedFile.create({
      user_id: req.user.id,
      entity_id: req.body.entityId || null,
      file_name: req.file.originalname,
      file_path: `/uploads/${req.file.filename}`,
      mime_type: req.file.mimetype,
      size_bytes: req.file.size,
    })
    console.log('✅ File uploaded:', savedFile.file_name)
    res.json({ success: true, file: savedFile })
  } catch (err) {
    console.error('❌ Upload failed:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// List uploaded files
router.get('/upload', async (req, res) => {
  try {
    const files = await UploadedFile.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
    })
    res.json({ success: true, files })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// -------------------------------------------------------------
// GET /api/entities/template/:entityTypeId → Excel Template (direct cell range validation)
// -------------------------------------------------------------
router.get('/template/:entityTypeId', async (req, res) => {
  try {
    const { entityTypeId } = req.params
    console.log(`📘 Generating template for EntityType ${entityTypeId}`)

    const entityType = await EntityType.findByPk(entityTypeId)
    if (!entityType) return res.status(404).json({ success: false, message: 'Entity type not found' })

    let fields = await EntityTypeField.findAll({
      where: { entity_type_id: entityTypeId },
      order: [['sort_order', 'ASC']],
    })

    // Normalise options
    fields = fields.map(f => ({
      name: f.name,
      label: f.label,
      required: !!f.required,
      data_type: f.data_type,
      options: (() => {
        const opt = f.options
        if (!opt) return []
        if (Array.isArray(opt)) return opt
        if (typeof opt === 'object' && Array.isArray(opt.values)) return opt.values
        if (typeof opt === 'object' && Object.keys(opt).length > 0) {
          return Object.values(opt).flat().filter(Boolean)
        }
        if (typeof opt === 'string') {
          try {
            const parsed = JSON.parse(opt)
            if (Array.isArray(parsed)) return parsed
            if (Array.isArray(parsed.values)) return parsed.values
          } catch {}
          return opt.split(',').map(o => o.trim()).filter(Boolean)
        }
        return []
      })(),
    }))

    console.log('🧩 Normalised fields:', fields)

    const workbook = new ExcelJS.Workbook()
    const mainSheet = workbook.addWorksheet('Template')
    const lookupSheet = workbook.addWorksheet('Lookups')

    // Headers + hints
    const headers = ['Name', 'Description', ...fields.map(f => `${f.label || f.name}${f.required ? ' *' : ''}`)]
    const hints = ['string', 'string', ...fields.map(f => {
      if (f.data_type === 'enum' && f.options.length) return 'Select from dropdown'
      if (f.data_type === 'boolean') return 'TRUE / FALSE'
      return f.data_type || 'string'
    })]
    mainSheet.addRow(headers)
    mainSheet.addRow(hints)

    // --- Lookup values ---
    let col = 1
    const rangeRefs = {}
    for (const f of fields) {
      if ((f.data_type === 'enum' && f.options.length > 0) || f.data_type === 'boolean') {
        const values = f.data_type === 'boolean' ? ['TRUE', 'FALSE'] : f.options
        lookupSheet.getCell(1, col).value = f.name
        values.forEach((opt, i) => lookupSheet.getCell(i + 2, col).value = opt)
        const endRow = values.length + 1
        const colLetter = String.fromCharCode(64 + col)
        const absRange = `Lookups!$${colLetter}$2:$${colLetter}$${endRow}`
        rangeRefs[f.name] = absRange
        col++
      }
    }

    // Apply dropdowns using direct cell range (no named ranges)
    fields.forEach((f, i) => {
      const range = rangeRefs[f.name]
      if (!range) return
      const colIndex = i + 3 // skip name + description
      for (let r = 3; r <= 1000; r++) {
        const cell = mainSheet.getCell(r, colIndex)
        cell.dataValidation = {
          type: 'list',
          allowBlank: !f.required,
          formulae: [`=${range}`],
          showErrorMessage: true,
          showDropDown: true,
          errorTitle: 'Invalid Option',
          error: `Please choose a valid value for ${f.label || f.name}`,
        }
      }
    })

    // Styling
    mainSheet.getRow(1).font = { bold: true }
    mainSheet.getRow(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } }
    mainSheet.views = [{ state: 'frozen', ySplit: 2 }]
    mainSheet.columns.forEach(c => (c.width = 22))
    lookupSheet.columns.forEach(c => (c.width = 20))

    // Send
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${entityType.name}_Template.xlsx"`
    )
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

    await workbook.xlsx.write(res)
    res.end()
    console.log('✅ Template generated successfully with working dropdowns')
  } catch (err) {
    console.error('❌ Template generation failed:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// -------------------------------------------
// Entity-related routes
// -------------------------------------------
router.get('/:id/graph', getEntityGraph)
router.post('/', createEntity)
router.get('/search', searchEntities)
router.get('/:id', getEntityById)
router.patch('/:id', updateEntity)
router.delete('/:id', deleteEntity)
router.get('/:id/secrets', getEntitySecrets)
router.post('/:id/secrets', createEntitySecret)

export default router
