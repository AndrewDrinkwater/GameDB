import { Op } from 'sequelize'
import {
  BulkUpdateRun,
  BulkUpdateChange,
  Campaign,
  Character,
  Entity,
  User,
  World,
  sequelize,
} from '../models/index.js'
import {
  BulkAccessValidationError,
  buildEntityAccessUpdate,
  normaliseBulkAccessPayload,
} from '../utils/bulkAccessValidation.js'

const respondWithError = (res, error, fallbackMessage = 'Unable to process request') => {
  if (error instanceof BulkAccessValidationError) {
    return res.status(error.status).json({
      success: false,
      error: {
        reason: 'validation_error',
        message: error.message,
        suggestedFix: error.suggestedFix,
        ...error.meta,
      },
    })
  }

  console.error(fallbackMessage, error)
  return res.status(500).json({ success: false, message: fallbackMessage })
}

const ensureWorldOwner = async (worldId, user) => {
  const world = await World.findByPk(worldId, { attributes: ['id', 'name', 'created_by'] })
  if (!world) {
    throw new BulkAccessValidationError('World not found', { status: 404 })
  }

  const isOwner = String(world.created_by) === String(user?.id)
  if (!isOwner) {
    throw new BulkAccessValidationError('Only the world owner can perform this action', {
      status: 403,
      suggestedFix: 'Switch to the world owner account for this world',
    })
  }

  return world
}

const fetchEntitiesForUpdate = async (entityIds) => {
  const entities = await Entity.findAll({
    where: { id: { [Op.in]: entityIds } },
    order: [['created_at', 'DESC']],
  })

  if (entities.length !== entityIds.length) {
    const foundIds = new Set(entities.map((entity) => String(entity.id)))
    const missingId = entityIds.find((id) => !foundIds.has(id))
    throw new BulkAccessValidationError('Entity not found or inaccessible', {
      status: 404,
      meta: { entityId: missingId },
    })
  }

  const worldIds = new Set(entities.map((entity) => String(entity.world_id)))
  if (worldIds.size !== 1) {
    throw new BulkAccessValidationError('All entities must belong to the same world', {
      meta: { entityId: entities[0]?.id },
    })
  }

  return { entities, worldId: worldIds.values().next().value }
}

const ensureCampaignsBelongToWorld = async (campaignIds, worldId) => {
  if (!campaignIds.length) return
  const campaigns = await Campaign.findAll({
    where: {
      id: { [Op.in]: campaignIds },
      world_id: worldId,
    },
    attributes: ['id'],
  })

  const found = new Set(campaigns.map((campaign) => String(campaign.id)))
  const missing = campaignIds.find((id) => !found.has(id))
  if (missing) {
    throw new BulkAccessValidationError('Campaign does not exist in this world', {
      meta: { campaignId: missing },
      suggestedFix: 'Select campaigns that belong to the same world as the entities',
    })
  }
}

const ensureCharactersBelongToWorld = async (characterIds, worldId) => {
  if (!characterIds.length) return
  const characters = await Character.findAll({
    where: { id: { [Op.in]: characterIds } },
    attributes: ['id'],
    include: [
      {
        model: Campaign,
        as: 'campaign',
        attributes: ['id', 'world_id'],
        where: { world_id: worldId },
        required: true,
      },
    ],
  })

  const found = new Set(characters.map((character) => String(character.id)))
  const missing = characterIds.find((id) => !found.has(id))
  if (missing) {
    throw new BulkAccessValidationError('Character must belong to a campaign in this world', {
      meta: { characterId: missing },
      suggestedFix: 'Choose characters whose campaigns are part of this world',
    })
  }
}

const ensureUsersExist = async (userIds) => {
  if (!userIds.length) return
  const users = await User.findAll({
    where: { id: { [Op.in]: userIds } },
    attributes: ['id'],
  })
  const found = new Set(users.map((user) => String(user.id)))
  const missing = userIds.find((id) => !found.has(id))
  if (missing) {
    throw new BulkAccessValidationError('User not found', {
      meta: { userId: missing },
      suggestedFix: 'Verify the selected user still exists',
    })
  }
}

const validateReferenceIds = async (worldId, payload) => {
  await ensureCampaignsBelongToWorld(payload.readCampaignIds, worldId)
  await ensureCampaignsBelongToWorld(payload.writeCampaignIds, worldId)
  await ensureCharactersBelongToWorld(payload.readCharacterIds, worldId)
  await ensureUsersExist(payload.readUserIds)
  await ensureUsersExist(payload.writeUserIds)
}

const plainEntityState = (entity) => {
  const plain = entity.get({ plain: true })
  return {
    read_access: plain.read_access,
    write_access: plain.write_access,
    read_campaign_ids: plain.read_campaign_ids || [],
    read_user_ids: plain.read_user_ids || [],
    read_character_ids: plain.read_character_ids || [],
    write_campaign_ids: plain.write_campaign_ids || [],
    write_user_ids: plain.write_user_ids || [],
  }
}

export const applyBulkAccessUpdate = async (req, res) => {
  try {
    const payload = normaliseBulkAccessPayload(req.body || {})
    const { entities, worldId } = await fetchEntitiesForUpdate(payload.entityIds)
    const world = await ensureWorldOwner(worldId, req.user)
    await validateReferenceIds(world.id, payload)

    const transaction = await sequelize.transaction()
    try {
      const run = await BulkUpdateRun.create(
        {
          world_id: world.id,
          user_id: req.user.id,
          campaign_context_id: req.campaignContextId || null,
          description: payload.description,
          entity_count: entities.length,
        },
        { transaction },
      )

      for (const entity of entities) {
        const before = plainEntityState(entity)
        await BulkUpdateChange.create(
          {
            run_id: run.id,
            entity_id: entity.id,
            old_read_access: before.read_access,
            old_write_access: before.write_access,
            old_read_campaign_ids: before.read_campaign_ids,
            old_read_user_ids: before.read_user_ids,
            old_read_character_ids: before.read_character_ids,
            old_write_campaign_ids: before.write_campaign_ids,
            old_write_user_ids: before.write_user_ids,
          },
          { transaction },
        )

        const updates = buildEntityAccessUpdate(entity, payload)
        await entity.update(updates, { transaction })
      }

      await transaction.commit()

      return res.json({
        success: true,
        data: { runId: run.id, count: entities.length, worldId: world.id },
      })
    } catch (err) {
      await transaction.rollback()
      throw err
    }
  } catch (error) {
    return respondWithError(res, error, 'Failed to apply bulk access update')
  }
}

const loadRunForWorld = async (runId) => {
  const run = await BulkUpdateRun.findByPk(runId)
  if (!run) {
    throw new BulkAccessValidationError('Bulk update run not found', { status: 404 })
  }
  return run
}

export const revertBulkAccessRun = async (req, res) => {
  try {
    const run = await loadRunForWorld(req.params.id)
    await ensureWorldOwner(run.world_id, req.user)

    if (run.reverted) {
      throw new BulkAccessValidationError('This run was already reverted', {
        status: 409,
        suggestedFix: 'Run reverts are one-time operations',
      })
    }

    const changes = await BulkUpdateChange.findAll({
      where: { run_id: run.id },
      order: [['created_at', 'ASC']],
    })

    const transaction = await sequelize.transaction()
    try {
      for (const change of changes) {
        const entity = await Entity.findByPk(change.entity_id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        })
        if (!entity) {
          throw new BulkAccessValidationError('Entity no longer exists, cannot revert run', {
            status: 409,
            meta: { entityId: change.entity_id },
          })
        }

        await entity.update(
          {
            read_access: change.old_read_access,
            write_access: change.old_write_access,
            read_campaign_ids: change.old_read_campaign_ids,
            read_user_ids: change.old_read_user_ids,
            read_character_ids: change.old_read_character_ids,
            write_campaign_ids: change.old_write_campaign_ids,
            write_user_ids: change.old_write_user_ids,
          },
          { transaction },
        )
      }

      await run.update({ reverted: true }, { transaction })
      await transaction.commit()

      return res.json({
        success: true,
        data: { runId: run.id, reverted: true, count: changes.length },
      })
    } catch (err) {
      await transaction.rollback()
      throw err
    }
  } catch (error) {
    return respondWithError(res, error, 'Failed to revert bulk access run')
  }
}

export const listBulkAccessRuns = async (req, res) => {
  try {
    const rawWorldId = typeof req.query.worldId === 'string' ? req.query.worldId.trim() : ''
    if (!rawWorldId) {
      throw new BulkAccessValidationError('worldId is required', { status: 400 })
    }

    await ensureWorldOwner(rawWorldId, req.user)

    const runs = await BulkUpdateRun.findAll({
      where: { world_id: rawWorldId },
      include: [{ model: User, as: 'actor', attributes: ['id', 'username', 'email'] }],
      attributes: {
        include: [
          [
            sequelize.literal(
              '(SELECT COUNT(*) FROM bulk_update_changes buc WHERE buc.run_id = "BulkUpdateRun"."id")',
            ),
            'change_count',
          ],
        ],
      },
      order: [['created_at', 'DESC']],
    })

    const payload = runs.map((run) => run.get({ plain: true }))

    return res.json({ success: true, data: payload })
  } catch (error) {
    return respondWithError(res, error, 'Failed to list bulk runs')
  }
}

export const getBulkAccessRun = async (req, res) => {
  try {
    const run = await BulkUpdateRun.findByPk(req.params.id, {
      include: [
        { model: User, as: 'actor', attributes: ['id', 'username', 'email'] },
        {
          model: BulkUpdateChange,
          as: 'changes',
          include: [
            {
              model: Entity,
              as: 'entity',
              attributes: [
                'id',
                'name',
                'read_access',
                'write_access',
                'read_campaign_ids',
                'read_user_ids',
                'read_character_ids',
                'write_campaign_ids',
                'write_user_ids',
              ],
            },
          ],
          separate: true,
          order: [['created_at', 'ASC']],
        },
      ],
    })

    if (!run) {
      throw new BulkAccessValidationError('Bulk update run not found', { status: 404 })
    }

    await ensureWorldOwner(run.world_id, req.user)

    const changeCount = run.changes?.length ?? 0

    return res.json({
      success: true,
      data: {
        ...run.get({ plain: true }),
        change_count: changeCount,
      },
    })
  } catch (error) {
    return respondWithError(res, error, 'Failed to load bulk run')
  }
}
