'use strict';
const { DataTypes } = require('sequelize');

const CATEGORIES = ['Electronics', 'Clothing', 'Documents', 'Keys', 'Bags & Backpacks',
  'Books', 'Glasses', 'Jewelry', 'Sports', 'Other'];
const STATUSES = ['lost', 'found'];

module.exports = (sequelize) => {
  const LostObject = sequelize.define('LostObject', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    image: { type: DataTypes.STRING(255), allowNull: true },
    location: { type: DataTypes.STRING(200), allowNull: false },
    category: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'Other', validate: { isIn: [CATEGORIES] } },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.ENUM(...STATUSES), allowNull: false, defaultValue: 'lost' },
    contact_email: { type: DataTypes.STRING(150), allowNull: true, validate: { isEmail: true } },
  }, {
    tableName: 'objects',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  });

  LostObject.CATEGORIES = CATEGORIES;
  LostObject.STATUSES = STATUSES;
  return LostObject;
};
