const db = require('../database/db');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');

const upload = multer({ storage: multer.memoryStorage() });

exports.uploadAvatarMiddleware = upload.single('avatar');

exports.uploadAvatar = async (req, res) => {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    // Convert buffer to base64 for Cloudinary
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    const dataURI = `data:${req.file.mimetype};base64,${b64}`;
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'avatars',
      resource_type: 'image',
    });
    const avatarUrl = result.secure_url;
    await db.query('UPDATE staff SET photo_url = ? WHERE id = ?', [avatarUrl, id]);
    res.json({ url: avatarUrl });
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    res.status(500).json({ error: 'Failed to update avatar', details: err.message });
  }
};

exports.changePassword = async (req, res) => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }
  try {
    const [rows] = await db.query('SELECT password FROM staff WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Staff member not found' });
    const user = rows[0];
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ error: 'Current password is incorrect' });
    const newHash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE staff SET password = ? WHERE id = ?', [newHash, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password' });
  }
};

exports.getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT id, name, business_email as email, role, photo_url as avatar_url FROM staff WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Staff member not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch staff member' });
  }
}; 