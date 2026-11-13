'use strict';
const { DataTypes } = require('sequelize');

/**
 * OAuth 2.1 persistence. Only SHA-256 hashes of codes/tokens are stored,
 * so a database leak does not leak usable credentials.
 */
module.exports = (sequelize) => {
  const AuthorizationCode = sequelize.define('AuthorizationCode', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    code_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    client_id: { type: DataTypes.STRING(100), allowNull: false },
    redirect_uri: { type: DataTypes.STRING(500), allowNull: false },
    code_challenge: { type: DataTypes.STRING(128), allowNull: false },
    scope: { type: DataTypes.STRING(500), allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    used_at: { type: DataTypes.DATE, allowNull: true },
  }, { tableName: 'oauth_authorization_codes', timestamps: true, createdAt: 'created_at', updatedAt: false });

  const RefreshToken = sequelize.define('RefreshToken', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    token_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    family_id: { type: DataTypes.STRING(36), allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    client_id: { type: DataTypes.STRING(100), allowNull: false },
    scope: { type: DataTypes.STRING(500), allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    revoked_at: { type: DataTypes.DATE, allowNull: true },
    replaced_by: { type: DataTypes.INTEGER, allowNull: true },
  }, { tableName: 'oauth_refresh_tokens', timestamps: true, createdAt: 'created_at', updatedAt: false });

  return { AuthorizationCode, RefreshToken };
};
