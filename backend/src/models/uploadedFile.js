// src/models/uploadedFile.js
export default (sequelize, DataTypes) => {
  const UploadedFile = sequelize.define(
    'UploadedFile',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      entity_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      file_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      file_path: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      mime_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      size_bytes: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: 'uploaded_files',
      underscored: true,
      timestamps: true,
      freezeTableName: true,
    }
  );

  UploadedFile.associate = (models) => {
    UploadedFile.belongsTo(models.User, { foreignKey: 'user_id', as: 'uploader' });
    UploadedFile.belongsTo(models.Entity, { foreignKey: 'entity_id', as: 'entity' });
  };

  return UploadedFile;
};
