import { Op } from 'sequelize'
import {
  BulkUpdateRun,
  BulkUpdateChange,
  Campaign,
  Character,
  Entity,
  User,
  UserCampaignRole,
  World,
  sequelize,
} from '../models/index.js'
import {
  BulkAccessValidationError,
  buildEntityAccessUpdate,
  normaliseBulkAccessPayload,
} from '../utils/bulkAccessValidation.js'
import {
  ensureEntitiesVisibleToCampaign,
  ensurePayloadWithinCampaignScope,
} from '../utils/campaignBulkAccess.js'

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

const loadCampaignScope = async (campaignId) => {
  const [campaign, members, characters] = await Promise.all([
    Campaign.findByPk(campaignId, { attributes: ['id', 'name', 'world_id'] }),
    UserCampaignRole.findAll({
      where: { campaign_id: campaignId },
      attributes: ['user_id'],
    }),
    Character.findAll({ where: { campaign_id: campaignId }, attributes: ['id'] }),
  ])

  if (!campaign) {
    throw new BulkAccessValidationError('Campaign not found', {
      status: 404,
      meta: { campaignId },
    })
  }

  const memberUserIds = new Set(members.map((member) => String(member.user_id)))
  const campaignCharacterIds = new Set(characters.map((character) => String(character.id)))

  return { campaign, memberUserIds, campaignCharacterIds }
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
    const isCampaignDM = req.campaignRole === 'dm'

    let world = null
    let actorRole = 'owner'
    let campaignScope = null

    if (isCampaignDM) {
      if (!req.campaignContextId) {
        throw new BulkAccessValidationError('Campaign context is required for DM updates', {
          status: 400,
        })
      }

      campaignScope = await loadCampaignScope(req.campaignContextId)

      if (String(campaignScope.campaign.world_id) !== String(worldId)) {
        throw new BulkAccessValidationError('Campaign and entities must belong to the same world', {
          status: 400,
          suggestedFix: 'Choose entities from the active campaign’s world',
        })
      }

      ensureEntitiesVisibleToCampaign(entities, {
        campaignId: campaignScope.campaign.id,
        campaignCharacterIds: campaignScope.campaignCharacterIds,
      })

      ensurePayloadWithinCampaignScope(payload, {
        campaignId: campaignScope.campaign.id,
        memberUserIds: campaignScope.memberUserIds,
        campaignCharacterIds: campaignScope.campaignCharacterIds,
      })

      world = await World.findByPk(worldId, { attributes: ['id', 'name', 'created_by'] })
      if (!world) {
        throw new BulkAccessValidationError('World not found', { status: 404 })
      }
      actorRole = 'dm'
    } else {
      world = await ensureWorldOwner(worldId, req.user)
    }

    await validateReferenceIds(world.id, payload)

    const transaction = await sequelize.transaction()
    try {
      const run = await BulkUpdateRun.create(
        {
          world_id: world.id,
          user_id: req.user.id,
          campaign_context_id: isCampaignDM ? campaignScope?.campaign.id : null,
          description: payload.description,
          entity_count: entities.length,
          role_used: actorRole,
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
        data: {
          runId: run.id,
          count: entities.length,
          worldId: world.id,
          campaignContextId: run.campaign_context_id,
        },
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
      include: [
        { model: User, as: 'actor', attributes: ['id', 'username', 'email'] },
        { model: Campaign, as: 'campaignContext', attributes: ['id', 'name'] },
      ],
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
        { model: Campaign, as: 'campaignContext', attributes: ['id', 'name'] },
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

    // Convert to plain object first to ensure we can access all properties
    const plainRun = run.get({ plain: true })

    // Collect all unique campaign and user IDs from changes
    const campaignIds = new Set()
    const userIds = new Set()

    plainRun.changes?.forEach((change) => {
      // Old values
      if (Array.isArray(change.old_read_campaign_ids)) {
        change.old_read_campaign_ids.forEach((id) => campaignIds.add(String(id)))
      }
      if (Array.isArray(change.old_write_campaign_ids)) {
        change.old_write_campaign_ids.forEach((id) => campaignIds.add(String(id)))
      }
      if (Array.isArray(change.old_read_user_ids)) {
        change.old_read_user_ids.forEach((id) => userIds.add(String(id)))
      }
      if (Array.isArray(change.old_write_user_ids)) {
        change.old_write_user_ids.forEach((id) => userIds.add(String(id)))
      }

      // New values from entity
      if (change.entity?.read_campaign_ids && Array.isArray(change.entity.read_campaign_ids)) {
        change.entity.read_campaign_ids.forEach((id) => campaignIds.add(String(id)))
      }
      if (change.entity?.write_campaign_ids && Array.isArray(change.entity.write_campaign_ids)) {
        change.entity.write_campaign_ids.forEach((id) => campaignIds.add(String(id)))
      }
      if (change.entity?.read_user_ids && Array.isArray(change.entity.read_user_ids)) {
        change.entity.read_user_ids.forEach((id) => userIds.add(String(id)))
      }
      if (change.entity?.write_user_ids && Array.isArray(change.entity.write_user_ids)) {
        change.entity.write_user_ids.forEach((id) => userIds.add(String(id)))
      }
    })

    // Fetch campaigns and users
    const [campaigns, users] = await Promise.all([
      campaignIds.size > 0
        ? Campaign.findAll({
            where: { id: { [Op.in]: Array.from(campaignIds) } },
            attributes: ['id', 'name'],
          })
        : [],
      userIds.size > 0
        ? User.findAll({
            where: { id: { [Op.in]: Array.from(userIds) } },
            attributes: ['id', 'username', 'email'],
          })
        : [],
    ])

    // Create lookup maps
    const campaignMap = new Map()
    campaigns.forEach((campaign) => {
      campaignMap.set(String(campaign.id), campaign.name || `Campaign ${campaign.id.slice(0, 8)}`)
    })

    const userMap = new Map()
    users.forEach((user) => {
      const label = user.username || user.email || `User ${user.id.slice(0, 8)}`
      userMap.set(String(user.id), label)
    })

    // Transform the run data to include resolved names
    const transformedChanges = plainRun.changes?.map((change) => {
      const transformIds = (ids, map) => {
        if (!ids) return []
        if (!Array.isArray(ids)) return []
        if (ids.length === 0) return []
        return ids.map((id) => {
          if (!id) return id
          return map.get(String(id)) || id
        })
      }

      const oldReadCampaignIds = change.old_read_campaign_ids || []
      const oldWriteCampaignIds = change.old_write_campaign_ids || []
      const oldReadUserIds = change.old_read_user_ids || []
      const oldWriteUserIds = change.old_write_user_ids || []

      return {
        ...change,
        old_read_campaign_names: transformIds(oldReadCampaignIds, campaignMap),
        old_write_campaign_names: transformIds(oldWriteCampaignIds, campaignMap),
        old_read_user_names: transformIds(oldReadUserIds, userMap),
        old_write_user_names: transformIds(oldWriteUserIds, userMap),
        entity: change.entity
          ? {
              ...change.entity,
              read_campaign_names: transformIds(change.entity.read_campaign_ids, campaignMap),
              write_campaign_names: transformIds(change.entity.write_campaign_ids, campaignMap),
              read_user_names: transformIds(change.entity.read_user_ids, userMap),
              write_user_names: transformIds(change.entity.write_user_ids, userMap),
            }
          : null,
      }
    })

    return res.json({
      success: true,
      data: {
        ...plainRun,
        changes: transformedChanges,
        change_count: changeCount,
      },
    })
  } catch (error) {
    return respondWithError(res, error, 'Failed to load bulk run')
  }
}
