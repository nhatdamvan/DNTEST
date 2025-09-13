const { query } = require('../config/database');

async function createAdminUser({ name, email, password, role }) {
  const result = await query(
    `INSERT INTO admin_users (name, email, password, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, created_at`,
    [name, email, password, role]
  );
  return result.rows[0];
}

async function getAdminUserById(id) {
  const result = await query(
    `SELECT id, name, email, role, created_at, updated_at FROM admin_users WHERE id = $1`,
    [id]
  );
  return result.rows[0];
}

async function getAllAdminUsers() {
  const result = await query(
    `SELECT id, name, email, role, created_at, updated_at FROM admin_users ORDER BY created_at DESC`
  );
  return result.rows;
}

async function updateAdminUser(id, { name, email, password, role }) {
  const result = await query(
    `UPDATE admin_users
     SET name = $2, email = $3, password = $4, role = $5, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, name, email, role, created_at, updated_at`,
    [id, name, email, password, role]
  );
  return result.rows[0];
}

async function deleteAdminUser(id) {
  const result = await query(
    `DELETE FROM admin_users WHERE id = $1 RETURNING id`,
    [id]
  );
  return result.rows[0];
}

async function findAdminUserByUsernameOrEmail(username) {
  const result = await query(
    'SELECT * FROM admin_users WHERE email = $1 OR username = $1',
    [username]
  );
  return result.rows[0];
}

module.exports = {
  createAdminUser,
  getAdminUserById,
  getAllAdminUsers,
  updateAdminUser,
  deleteAdminUser,
  findAdminUserByUsernameOrEmail
};