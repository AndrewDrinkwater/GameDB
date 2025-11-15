// src/models/world.js
export default (sequelize, DataTypes) => {
  const World = sequelize.define(
    'World',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      system: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Game system or ruleset (e.g., D&D 5e, Pathfinder)',
      },
      status: {
        type: DataTypes.ENUM('active', 'archived'),
        defaultValue: 'active',
        allowNull: false,
      },
      entity_creation_scope: {
        type: DataTypes.ENUM('owner_dm', 'all_players'),
        allowNull: false,
        defaultValue: 'owner_dm',
        comment: 'Controls who can create entities inside this world',
      },
      created_by: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      tableName: 'Worlds',
      timestamps: true, // createdAt & updatedAt
    }
  )

  World.associate = (models) => {
    World.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator',
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    })

    if (models.Campaign) {
      World.hasMany(models.Campaign, {
        foreignKey: 'world_id',
        as: 'campaigns',
        onDelete: 'CASCADE',
      })
    }

    if (models.Entity) {
      World.hasMany(models.Entity, {
        foreignKey: 'world_id',
        as: 'entities',
        onDelete: 'CASCADE',
      })
    }

    if (models.EntityType) {
      World.hasMany(models.EntityType, {
        foreignKey: 'world_id',
        as: 'entityTypes',
        onDelete: 'CASCADE',
      })
    }
  }

  return World
}

