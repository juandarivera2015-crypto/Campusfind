'use strict';
/**
 * Core schema (users, objects, messages). Mirrors legacy/database.sql so an
 * existing XAMPP database can be reused: tables that already exist are skipped.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const existing = (await queryInterface.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName));
    const now = { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') };

    if (!existing.includes('users')) {
      await queryInterface.createTable('users', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: Sequelize.STRING(100), allowNull: false },
        email: { type: Sequelize.STRING(150), allowNull: false, unique: true },
        password: { type: Sequelize.STRING(255), allowNull: false },
        created_at: now,
      });
    }

    if (!existing.includes('objects')) {
      await queryInterface.createTable('objects', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
        name: { type: Sequelize.STRING(150), allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: false },
        image: { type: Sequelize.STRING(255), allowNull: true },
        location: { type: Sequelize.STRING(200), allowNull: false },
        category: { type: Sequelize.STRING(80), allowNull: false, defaultValue: 'Other' },
        date: { type: Sequelize.DATEONLY, allowNull: false },
        status: { type: Sequelize.ENUM('lost', 'found'), allowNull: false, defaultValue: 'lost' },
        contact_email: { type: Sequelize.STRING(150), allowNull: true },
        created_at: now,
      });
      await queryInterface.addIndex('objects', ['status']);
      await queryInterface.addIndex('objects', ['category']);
      await queryInterface.addIndex('objects', ['created_at']);
    }

    if (!existing.includes('messages')) {
      await queryInterface.createTable('messages', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        object_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'objects', key: 'id' }, onDelete: 'CASCADE' },
        sender_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
        receiver_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
        message: { type: Sequelize.TEXT, allowNull: false },
        is_read: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        created_at: now,
      });
      await queryInterface.addIndex('messages', ['receiver_id', 'is_read']);
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('messages');
    await queryInterface.dropTable('objects');
    await queryInterface.dropTable('users');
  },
};
