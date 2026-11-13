'use strict';
/** OAuth 2.1 authorization codes and rotating refresh tokens (hashed). */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') };
    await queryInterface.createTable('oauth_authorization_codes', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      code_hash: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      client_id: { type: Sequelize.STRING(100), allowNull: false },
      redirect_uri: { type: Sequelize.STRING(500), allowNull: false },
      code_challenge: { type: Sequelize.STRING(128), allowNull: false },
      scope: { type: Sequelize.STRING(500), allowNull: false },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      used_at: { type: Sequelize.DATE, allowNull: true },
      created_at: now,
    });
    await queryInterface.createTable('oauth_refresh_tokens', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      token_hash: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      family_id: { type: Sequelize.STRING(36), allowNull: false },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      client_id: { type: Sequelize.STRING(100), allowNull: false },
      scope: { type: Sequelize.STRING(500), allowNull: false },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
      replaced_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: now,
    });
    await queryInterface.addIndex('oauth_refresh_tokens', ['family_id']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('oauth_refresh_tokens');
    await queryInterface.dropTable('oauth_authorization_codes');
  },
};
