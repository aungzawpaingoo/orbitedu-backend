const pool = require('../config/db');
const path = require('path');

const upsertUserProfile = async (req, res) => {
  const userId = req.params.userId;
  const {
    phone,
    gender,
    dob,
    address,
    national_id,
    education,
    certifications,
    experience,
    contract_start_date,
    contract_end_date
  } = req.body;

  const profile_photo_url = req.files?.profile_photo?.[0]?.path.replace(/\\/g, '/') || null;
  const contract_file = req.files?.contract_file?.[0]?.path.replace(/\\/g, '/') || null;

  try {
    const [existing] = await pool.promise().execute(
      'SELECT id FROM user_profiles WHERE user_id = ?',
      [userId]
    );

    if (existing.length > 0) {
      const updateFields = [];
      const values = [];

      if (phone) { updateFields.push('phone = ?'); values.push(phone); }
      if (gender) { updateFields.push('gender = ?'); values.push(gender); }
      if (dob) { updateFields.push('dob = ?'); values.push(dob); }
      if (address) { updateFields.push('address = ?'); values.push(address); }
      if (national_id) { updateFields.push('national_id = ?'); values.push(national_id); }
      if (education) { updateFields.push('education = ?'); values.push(education); }
      if (certifications) { updateFields.push('certifications = ?'); values.push(certifications); }
      if (experience) { updateFields.push('experience = ?'); values.push(experience); }
      if (contract_start_date) { updateFields.push('contract_start_date = ?'); values.push(contract_start_date); }
      if (contract_end_date) { updateFields.push('contract_end_date = ?'); values.push(contract_end_date); }
      if (profile_photo_url) { updateFields.push('profile_photo_url = ?'); values.push(profile_photo_url); }
      if (contract_file) { updateFields.push('contract_file = ?'); values.push(contract_file); }

      values.push(userId);

      await pool.promise().execute(
        `UPDATE user_profiles SET ${updateFields.join(', ')} WHERE user_id = ?`,
        values
      );

      return res.status(200).json({ message: 'User profile updated' });
    } else {
      await pool.promise().execute(
        `INSERT INTO user_profiles (
          user_id, phone, gender, dob, address, national_id,
          education, certifications, experience,
          contract_start_date, contract_end_date,
          profile_photo_url, contract_file
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId, phone, gender, dob, address, national_id,
          education, certifications, experience,
          contract_start_date, contract_end_date,
          profile_photo_url, contract_file
        ]
      );

      return res.status(201).json({ message: 'User profile created' });
    }
  } catch (error) {
    console.error('❌ upsertUserProfile error:', error);
    res.status(500).json({ message: 'Profile update failed', error: error.message });
  }
};

const getUserProfile = async (req, res) => {
  const userId = req.params.userId;

  try {
    const [result] = await pool.promise().execute(
      'SELECT * FROM user_profiles WHERE user_id = ?',
      [userId]
    );

    if (result.length === 0) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.json(result[0]);
  } catch (error) {
    console.error('❌ getUserProfile error:', error);
    res.status(500).json({ message: 'Failed to fetch profile', error: error.message });
  }
};

module.exports = {
  upsertUserProfile,
  getUserProfile
};
