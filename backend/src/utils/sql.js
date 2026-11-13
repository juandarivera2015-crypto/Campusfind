'use strict';
/**
 * Escapes LIKE wildcards so user input such as "%" or "_" is matched literally.
 * (Values are still sent as bound parameters by Sequelize — this is not the
 * SQL-injection defence, it prevents wildcard abuse / expensive scans.)
 */
function escapeLike(input) {
  return String(input).replace(/[\\%_]/g, (c) => `\\${c}`);
}
module.exports = { escapeLike };
