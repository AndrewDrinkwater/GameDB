import fs from 'fs/promises'
import { Jimp } from 'jimp'
import { Entity, EntityType, World, sequelize } from '../models/index.js'
import { checkWorldAccess } from '../middleware/worldAccess.js'
import { buildEntityReadContext, canUserWriteEntity } from '../utils/entityAccess.js'
import { buildEntityPayload } from './entityController.js'

const ACCEPTED_MIME_TYPES = new Set(['image/png', 'image/jpeg'])
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024 // 2MB
const TARGET_IMAGE_SIZE = 256
const TARGET_IMAGE_QUALITY = 70
const OPTIMIZED_MIME_TYPE = Jimp.MIME_JPEG

const ENTITY_INCLUDE = [
  { model: EntityType, as: 'entityType', attributes: ['id', 'name'] },
  { model: World, as: 'world', attributes: ['id', 'name', 'created_by'] },
  { association: 'creator', attributes: ['id', 'username', 'email'] },
]

const isValidId = (value) => typeof value === 'string' && Boolean(value.trim())

const cleanupUploadedFile = async (file) => {
  if (!file?.path) return
  try {
    await fs.unlink(file.path)
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      console.warn('⚠️ Failed to remove uploaded image file', error)
    }
  }
}

const optimiseUploadedImage = async (filePath) => {
  const image = await Jimp.read(filePath)
  image.cover(TARGET_IMAGE_SIZE, TARGET_IMAGE_SIZE)
  image.quality(TARGET_IMAGE_QUALITY)
  return image.getBufferAsync(OPTIMIZED_MIME_TYPE)
}

const fetchWritableEntity = async ({ id, user, campaignContextId }) => {
  const entity = await Entity.findByPk(id, { include: ENTITY_INCLUDE })
  if (!entity) {
    return { status: 404, body: { success: false, message: 'Entity not found' } }
  }

  const access = await checkWorldAccess(entity.world_id, user)
  if (!access.world) {
    return { status: 404, body: { success: false, message: 'World not found' } }
  }

  const readContext = await buildEntityReadContext({
    worldId: entity.world_id,
    user,
    worldAccess: access,
    campaignContextId,
  })

  if (!canUserWriteEntity(entity, readContext)) {
    return { status: 403, body: { success: false, message: 'Forbidden' } }
  }

  return { entity }
}

export const uploadEntityImage = async (req, res) => {
  const { id } = req.params
  if (!isValidId(id)) {
    await cleanupUploadedFile(req.file)
    return res.status(400).json({ success: false, message: 'Invalid entity id' })
  }

  const file = req.file
  if (!file) {
    return res.status(400).json({ success: false, message: 'File is required' })
  }

  if (!ACCEPTED_MIME_TYPES.has(file.mimetype)) {
    await cleanupUploadedFile(file)
    return res
      .status(400)
      .json({ success: false, message: 'Only PNG and JPG images are supported' })
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    await cleanupUploadedFile(file)
    return res.status(400).json({ success: false, message: 'File is too large' })
  }

  try {
    const { entity, status, body } = await fetchWritableEntity({
      id,
      user: req.user,
      campaignContextId: req.campaignContextId,
    })

    if (!entity) {
      await cleanupUploadedFile(file)
      return res.status(status).json(body)
    }

    const optimisedBuffer = await optimiseUploadedImage(file.path)
    const base64Data = optimisedBuffer.toString('base64')

    await sequelize.transaction(async (transaction) => {
      await entity.update(
        { image_data: base64Data, image_mime_type: OPTIMIZED_MIME_TYPE },
        { transaction },
      )
    })

    await entity.reload({ include: ENTITY_INCLUDE })
    const payload = await buildEntityPayload(entity)

    res.json({ success: true, data: payload })
  } catch (error) {
    console.error('❌ Failed to upload entity image', error)
    res.status(500).json({ success: false, message: 'Failed to upload image' })
  } finally {
    await cleanupUploadedFile(file)
  }
}

export const deleteEntityImage = async (req, res) => {
  const { id } = req.params
  if (!isValidId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid entity id' })
  }

  try {
    const { entity, status, body } = await fetchWritableEntity({
      id,
      user: req.user,
      campaignContextId: req.campaignContextId,
    })

    if (!entity) {
      return res.status(status).json(body)
    }

    await sequelize.transaction(async (transaction) => {
      await entity.update({ image_data: null, image_mime_type: null }, { transaction })
    })

    res.json({ success: true })
  } catch (error) {
    console.error('❌ Failed to delete entity image', error)
    res.status(500).json({ success: false, message: 'Failed to delete image' })
  }
}
