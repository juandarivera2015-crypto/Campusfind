'use strict';
/** Demo account (demo@campusfind.edu / password123) and a couple of sample reports. */
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE email = ?', { replacements: ['demo@campusfind.edu'] },
    );
    let userId = rows[0]?.id;
    if (!userId) {
      await queryInterface.bulkInsert('users', [{
        name: 'Demo Student', email: 'demo@campusfind.edu', password: bcrypt.hashSync('password123', 12),
      }]);
      const [again] = await queryInterface.sequelize.query(
        'SELECT id FROM users WHERE email = ?', { replacements: ['demo@campusfind.edu'] },
      );
      userId = again[0].id;
    }
    const today = new Date().toISOString().slice(0, 10);
    await queryInterface.bulkInsert('objects', [
      { user_id: userId, name: 'Blue backpack', description: 'Navy blue backpack with a calculus book inside.',
        location: 'Library 2nd floor', category: 'Bags & Backpacks', date: today, status: 'lost', contact_email: 'demo@campusfind.edu' },
      { user_id: userId, name: 'Student ID card', description: 'Found near the main entrance.',
        location: 'Main cafeteria', category: 'Documents', date: today, status: 'found', contact_email: 'demo@campusfind.edu' },
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { email: 'demo@campusfind.edu' });
  },
};
