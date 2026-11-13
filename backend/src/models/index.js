'use strict';
const sequelize = require('../db');

const User = require('./user')(sequelize);
const LostObject = require('./lostObject')(sequelize);
const Message = require('./message')(sequelize);
const { AuthorizationCode, RefreshToken } = require('./oauth')(sequelize);

// ── Associations ──
User.hasMany(LostObject, { foreignKey: 'user_id', as: 'objects', onDelete: 'CASCADE' });
LostObject.belongsTo(User, { foreignKey: 'user_id', as: 'owner' });

LostObject.hasMany(Message, { foreignKey: 'object_id', as: 'messages', onDelete: 'CASCADE' });
Message.belongsTo(LostObject, { foreignKey: 'object_id', as: 'object' });
Message.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'receiver_id', as: 'receiver' });

AuthorizationCode.belongsTo(User, { foreignKey: 'user_id', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id', onDelete: 'CASCADE' });

module.exports = { sequelize, User, LostObject, Message, AuthorizationCode, RefreshToken };
