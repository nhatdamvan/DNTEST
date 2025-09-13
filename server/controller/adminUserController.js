const adminUserService = require('../service/adminUserService');

async function createAdminUser(req, res) {
  try {
    const user = await adminUserService.createAdminUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ error: 'Failed to create admin user' });
  }
}

async function getAdminUserById(req, res) {
  try {
    const user = await adminUserService.getAdminUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Error fetching admin user:', error);
    res.status(500).json({ error: 'Failed to fetch admin user' });
  }
}

async function getAllAdminUsers(req, res) {
  try {
    const users = await adminUserService.getAllAdminUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: 'Failed to fetch admin users' });
  }
}

async function updateAdminUser(req, res) {
  try {
    const user = await adminUserService.updateAdminUser(req.params.id, req.body);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Error updating admin user:', error);
    res.status(500).json({ error: 'Failed to update admin user' });
  }
}

async function deleteAdminUser(req, res) {
  try {
    const deleted = await adminUserService.deleteAdminUser(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, id: deleted.id });
  } catch (error) {
    console.error('Error deleting admin user:', error);
    res.status(500).json({ error: 'Failed to delete admin user' });
  }
}

async function loginAdminUser(req, res) {
  try {
    const { username, password } = req.body;
    const result = await adminUserService.loginAdminUser({ username, password });
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message || 'Login failed' });
  }
}

module.exports = {
  createAdminUser,
  getAdminUserById,
  getAllAdminUsers,
  loginAdminUser,
  updateAdminUser,
  deleteAdminUser,
};