import fs from 'fs'
import path from 'path'
import multer from 'multer'
import XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/authMiddleware.js'
import {
  createEntity,
  createEntityResponse,
  createEntitySecret,
  deleteEntity,
  getEntityById,
  getEntitySecrets,
  searchEntities,
  updateEntitySecret,
  updateEntity,
  listUnassignedEntities,
} from '../controllers/entityController.js'
import { getEntityGraph } from '../controllers/entityGraphController.js'
import { checkWorldAccess } from '../middleware/worldAccess.js'
import { UploadedFile, EntityType, EntityTypeField } from '../models/index.js'
import {
  getEntityNotes,
  createEntityNote,
  listEntityMentionNotes,
} from '../controllers/entityNoteController.js'
import { listEntityMentionSessionNotes } from '../controllers/sessionNoteController.js'

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

router.get('/unassigned', requireRole('system_admin'), listUnassignedEntities)

// -------------------------------------------------------------
// POST /api/entities/upload → Upload a file + save metadata
// -------------------------------------------------------------
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

// -------------------------------------------------------------
// GET /api/entities/upload → List user’s uploaded files
// -------------------------------------------------------------
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
// DELETE /api/entities/upload/:id → Delete uploaded file
// -------------------------------------------------------------
router.delete('/upload/:id', async (req, res) => {
  try {
    const { id } = req.params
    const file = await UploadedFile.findByPk(id)
    if (!file || file.user_id !== req.user.id) {
      return res.status(404).json({ success: false, message: 'File not found or not owned by user' })
    }

    const filePath = path.resolve(`.${file.file_path}`)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    await file.destroy()

    console.log('🗑️ Deleted upload:', file.file_name)
    res.json({ success: true, message: 'File deleted successfully' })
  } catch (err) {
    console.error('❌ Delete failed:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// -------------------------------------------------------------
// GET /api/entities/template/:entityTypeId → Excel Template
// -------------------------------------------------------------
router.get('/template/:entityTypeId', async (req, res) => {
  try {
    const { entityTypeId } = req.params
    console.log(`📘 Generating template for EntityType ${entityTypeId}`)

    const entityType = await EntityType.findByPk(entityTypeId)
    if (!entityType) return res.status(404).json({ success: false, message: 'Entity type not found' })

    // Fetch metadata fields (may be none)
    let fields = []
    try {
      fields = await EntityTypeField.findAll({
        where: { entity_type_id: entityTypeId },
        order: [['sort_order', 'ASC']],
      })
    } catch (err) {
      console.warn('⚠️ Failed to fetch fields (continuing with no metadata):', err)
      fields = []
    }

    // Normalise options (works for {}, [], string, or { values: [] })
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

    console.log(`🧩 Normalised ${fields.length} fields for ${entityType.name}`)

    const workbook = new ExcelJS.Workbook()
    const mainSheet = workbook.addWorksheet('Template')
    const lookupSheet = workbook.addWorksheet('Lookups')

    // --- Headers + hints ---
    const headers = ['Name', 'Description', ...fields.map(f => `${f.label || f.name}${f.required ? ' *' : ''}`)]
    const hints = ['string', 'string', ...fields.map(f => {
      if (f.data_type === 'enum' && f.options.length) return 'Select from dropdown'
      if (f.data_type === 'boolean') return 'TRUE / FALSE'
      return f.data_type || 'string'
    })]

    mainSheet.addRow(headers)
    mainSheet.addRow(hints)

    // --- Lookup setup (only if fields exist) ---
    const rangeRefs = {}
    let col = 1

    if (fields.length > 0) {
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
    }

    if (fields.length === 0 || col === 1) {
      lookupSheet.getCell('A1').value = 'No lookup data available'
      lookupSheet.columns = [{ width: 25 }]
    }

    // --- Apply dropdowns safely ---
    if (fields.length > 0) {
      fields.forEach((f, i) => {
        const range = rangeRefs[f.name]
        if (!range) return
        const colIndex = i + 3
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
    }

    mainSheet.getRow(1).font = { bold: true }
    mainSheet.getRow(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } }
    mainSheet.views = [{ state: 'frozen', ySplit: 2 }]
    mainSheet.columns.forEach(c => (c.width = 22))
    lookupSheet.columns.forEach(c => (c.width = 20))

    res.setHeader('Content-Disposition', `attachment; filename="${entityType.name}_Template.xlsx"`)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    await workbook.xlsx.write(res)
    res.end()
    console.log('✅ Template generated successfully')
  } catch (err) {
    console.error('❌ Template generation failed:', err)
    res.status(500).json({ success: false, message: err.message })
  }
})

// -------------------------------------------------------------
// POST /api/entities/preview/:entityTypeId → Preview uploaded file
// -------------------------------------------------------------
router.post('/preview/:entityTypeId', async (req, res) => {
  try {
    const { entityTypeId } = req.params
    const { fileId, worldId: bodyWorldId, world_id: legacyWorldId } = req.body ?? {}

    if (!fileId) {
      return res.status(400).json({ success: false, message: 'Missing fileId' })
    }

    const uploadedFile = await UploadedFile.findByPk(fileId)
    if (!uploadedFile) {
      return res.status(404).json({ success: false, message: 'Uploaded file not found' })
    }

    const filePath = path.resolve(`.${uploadedFile.file_path}`)
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found on server' })
    }

    const entityType = await EntityType.findByPk(entityTypeId)
    if (!entityType) {
      return res.status(404).json({ success: false, message: 'Entity type not found' })
    }
    const requestedWorldId = bodyWorldId ?? legacyWorldId ?? entityType.world_id ?? null
    if (!requestedWorldId) {
      return res.status(400).json({ success: false, message: 'worldId is required for preview' })
    }

    const access = await checkWorldAccess(requestedWorldId, req.user)
    const { world, hasAccess, isOwner, isAdmin } = access

    if (!world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    if (!hasAccess && !isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const existingEntities = await EntityType.sequelize.query(
      `SELECT name FROM entities WHERE entity_type_id = :entityTypeId AND world_id = :worldId`,
      {
        replacements: { entityTypeId, worldId: world.id },
        type: EntityType.sequelize.QueryTypes.SELECT,
      }
    )
    const existingNames = new Set(existingEntities.map(e => e.name.toLowerCase()))

    const workbook = XLSX.readFile(filePath)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    // Skip first two header rows (title + hints)
      const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
      const dataRows = allRows.slice(2) // skip Name/Description headers + hint row
      const headers = allRows[0] || []
      const rows = dataRows.map(r => Object.fromEntries(r.map((v, i) => [headers[i] || `Column${i+1}`, v]))).filter(r => Object.values(r).some(Boolean))


    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'No rows found in spreadsheet.' })
    }

    const toCreate = []
    const duplicates = []
    const invalid = []

    rows.forEach((row, index) => {
      const name = row['Name']?.trim()
      if (!name) {
        invalid.push({ row: index + 2, reason: 'Missing Name' })
      } else if (existingNames.has(name.toLowerCase())) {
        duplicates.push({ row: index + 2, name })
      } else {
        toCreate.push({ row: index + 2, name })
      }
    })

    const summary = {
      total: rows.length,
      createCount: toCreate.length,
      duplicateCount: duplicates.length,
      invalidCount: invalid.length,
      toCreate,
      duplicates,
      invalid,
    }

    res.json({ success: true, summary })
  } catch (err) {
    console.error('❌ Preview generation failed:', err)
    res.status(500).json({ success: false, message: 'Preview failed', error: err.message })
  }
})

// -------------------------------------------------------------
// POST /api/entities/import/:entityTypeId → Parse & create entities
// -------------------------------------------------------------
router.post('/import/:entityTypeId', upload.single('file'), async (req, res) => {
  try {
    const { entityTypeId } = req.params
    const {
      fileId,
      worldId: bodyWorldId,
      world_id: legacyWorldId,
    } = req.body || {}
    const userId = req.user.id

    let filePath = req.file?.path
    let uploadedFile

    if (!filePath) {
      if (!fileId) {
        return res.status(400).json({ success: false, message: 'No file uploaded.' })
      }

      uploadedFile = await UploadedFile.findByPk(fileId)
      if (!uploadedFile || uploadedFile.user_id !== userId) {
        return res.status(404).json({ success: false, message: 'Uploaded file not found' })
      }

      filePath = path.resolve(`.${uploadedFile.file_path}`)
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'File not found on server' })
      }
    }

    console.log(`📥 Importing entities for EntityType ${entityTypeId}`)

    const entityType = await EntityType.findByPk(entityTypeId)
    if (!entityType) {
      return res.status(404).json({ success: false, message: 'Entity type not found' })
    }
    const requestedWorldId = bodyWorldId ?? legacyWorldId ?? entityType.world_id ?? null
    if (!requestedWorldId) {
      return res.status(400).json({ success: false, message: 'worldId is required for import' })
    }

    const access = await checkWorldAccess(requestedWorldId, req.user)
    const { world, hasAccess, isOwner, isAdmin } = access

    if (!world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    if (!hasAccess && !isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }
    const fields = await EntityTypeField.findAll({
      where: { entity_type_id: entityTypeId },
      order: [['sort_order', 'ASC']],
    })

    const workbook = XLSX.readFile(filePath)
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    // Skip first two header rows (title + hints)
    const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
    const dataRows = allRows.slice(2) // skip Name/Description headers + hint row
    const headers = allRows[0] || []
    const rows = dataRows.map(r => Object.fromEntries(r.map((v, i) => [headers[i] || `Column${i+1}`, v]))).filter(r => Object.values(r).some(Boolean))

    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'No rows found in spreadsheet.' })
    }

    const normaliseHeader = (key) => (key || '').toString().replace(/\*/g, '').trim().toLowerCase()

    const fieldMap = {}
    fields.forEach(f => {
      const labelKey = normaliseHeader(f.label)
      if (labelKey) fieldMap[labelKey] = f.name
      fieldMap[normaliseHeader(f.name)] = f.name
    })

    const created = []
    const failed = []

    for (const row of rows) {
      try {
        const name = row['Name']?.trim()
        if (!name) throw new Error('Missing Name column')

        const description = row['Description']?.trim() || ''
        const metadata = {}

        for (const key of Object.keys(row)) {
          if (key === 'Name' || key === 'Description') continue
          const normalisedKey = normaliseHeader(key)
          const mapped = fieldMap[normalisedKey]
          if (mapped) metadata[mapped] = row[key]
        }

        const result = await createEntityResponse({
          world,
          user: req.user,
          body: {
            name,
            description,
            world_id: world.id,
            entity_type_id: entityTypeId,
            metadata,
          },
        })

        if (!result?.body?.success || result.status >= 400) {
          throw new Error(result?.body?.message || 'Failed to create entity')
        }

        const createdName = result.body?.data?.name ?? name
        created.push(createdName)
      } catch (err) {
        failed.push({ row, error: err.message })
      }
    }

    console.log(`✅ Imported ${created.length} entities, ${failed.length} failed`)
    res.json({
      success: true,
      message: `Imported ${created.length} entities, ${failed.length} failed`,
      created,
      failed,
    })
  } catch (err) {
    console.error('❌ Entity import failed:', err)
    res.status(500).json({ success: false, message: 'Entity import failed', error: err.message })
  } finally {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path)
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
router.patch('/:id/secrets/:secretId', updateEntitySecret)
router.get('/:id/mentions/entity-notes', listEntityMentionNotes)
router.get('/:id/mentions/session-notes', listEntityMentionSessionNotes)
router.get('/:id/notes', getEntityNotes)
router.post('/:id/notes', createEntityNote)

export default router
