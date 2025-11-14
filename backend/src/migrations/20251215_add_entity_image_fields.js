/*
  src/migrations/20251215_add_entity_image_fields.js
*/

export async function up(queryInterface, Sequelize) {
  await queryInterface.sequelize.transaction(async (transaction) => {

    // image_data
    const [imageDataExists] = await queryInterface.sequelize.query(
      `SELECT column_name 
       FROM information_schema.columns
       WHERE table_name='entities'
       AND column_name='image_data';`,
      { transaction }
    );

    if (imageDataExists.length === 0) {
      await queryInterface.addColumn(
        'entities',
        'image_data',
        {
          type: Sequelize.TEXT,
          allowNull: true,
          defaultValue: null
        },
        { transaction }
      );
    }

    // image_mime_type
    const [imageMimeExists] = await queryInterface.sequelize.query(
      `SELECT column_name 
       FROM information_schema.columns
       WHERE table_name='entities'
       AND column_name='image_mime_type';`,
      { transaction }
    );

    if (imageMimeExists.length === 0) {
      await queryInterface.addColumn(
        'entities',
        'image_mime_type',
        {
          type: Sequelize.STRING(50),
          allowNull: true,
          defaultValue: null
        },
        { transaction }
      );
    }
  });
}

export async function down(queryInterface) {
  await queryInterface.sequelize.transaction(async (transaction) => {
    // Down should not fail if columns are missing
    await queryInterface.removeColumn('entities', 'image_data', { transaction })
      .catch(() => {});
    await queryInterface.removeColumn('entities', 'image_mime_type', { transaction })
      .catch(() => {});
  });
}
