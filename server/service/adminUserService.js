const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const adminUserRepository = require('../repositories/adminUserRepository');

async function createAdminUser(data) {
  // Hash the password before saving to DB
  const hashedPassword = await bcrypt.hash(data.password, 10);
  const userData = { ...data, password: hashedPassword };
  return await adminUserRepository.createAdminUser(userData);
}

async function getAdminUserById(id) {
  return await adminUserRepository.getAdminUserById(id);
}

async function getAllAdminUsers() {
  return await adminUserRepository.getAllAdminUsers();
}

async function updateAdminUser(id, data) {
  return await adminUserRepository.updateAdminUser(id, data);
}

async function deleteAdminUser(id) {
  return await adminUserRepository.deleteAdminUser(id);
}

async function loginAdminUser({ username, password }) {
  const user = await adminUserRepository.findAdminUserByUsernameOrEmail(username);
  if (!user) {
    throw new Error('Invalid credentials');
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    throw new Error('Invalid credentials');
  }

  console.log('Admin user service:', { id: user.id, username: user.name, role: user.role, email: user.email });
  const token = jwt.sign(
    { id: user.id, username: user.name, role: user.role, email: user.email },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '1d' }
  );

  return { token,   user: {
    id: user.id,
    username: user.name,
    role: user.role,
    email: user.email
  } };
}

module.exports = {
  createAdminUser,
  getAdminUserById,
  getAllAdminUsers,
  updateAdminUser,
  deleteAdminUser,
  loginAdminUser
};