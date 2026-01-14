const pool = require('../config/db');

/**
 * STEP 1: Create Organization
 * Only orbitEDU_Admin
 * Also submit KYC details
 */
exports.createOrganization = async (req, res) => {
  if (req.user.role !== 'orbitEDU_Admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  const {
    name,
    owner_full_name,
    owner_national_id,
    owner_document_type,
    owner_document_number,
    document_front_url,
    document_back_url,
    selfie_url
  } = req.body;

  try {
    // 1️⃣ Create organization
    const [orgResult] = await pool.promise().execute(
      'INSERT INTO organizations (name) VALUES (?)',
      [name]
    );
    const organization_id = orgResult.insertId;

    // 2️⃣ Insert KYC details
    await pool.promise().execute(
      `INSERT INTO organization_kyc
       (organization_id, owner_full_name, owner_national_id, owner_document_type, owner_document_number,
        document_front_url, document_back_url, selfie_url, verification_status, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [
        organization_id,
        owner_full_name,
        owner_national_id,
        owner_document_type,
        owner_document_number,
        document_front_url,
        document_back_url,
        selfie_url
      ]
    );

    res.status(201).json({
      message: 'Organization created with KYC submitted',
      organization_id,
      name
    });
  } catch (err) {
    console.error('❌ Organization creation error:', err);
    res.status(500).json({ message: 'Failed to create organization', error: err.message });
  }
};

/**
 * STEP 2: Create Branch
 * orbitEDU_Admin OR Super_Admin
 */
exports.createBranch = async (req, res) => {
  try {
    const {
      organization_id,
      name,
      location,
      address,
      city,
      country,
      billing_start_date,
      billing_end_date,
      billing_status = 'trial' // default
    } = req.body;

    if (!['orbitEDU_Admin', 'Super_Admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Validation
    if (!organization_id || !name || !location || !address || !city || !country || !billing_start_date) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    const [result] = await pool.promise().execute(
      `INSERT INTO branches
      (organization_id, name, location, address, city, country, billing_status, billing_start_date, billing_end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        organization_id,
        name,
        location,
        address,
        city,
        country,
        billing_status,
        billing_start_date,
        billing_end_date || null
      ]
    );

    res.status(201).json({
      branch_id: result.insertId,
      name
    });

  } catch (err) {
    console.error('❌ Create branch error:', err);
    res.status(500).json({ message: 'Branch creation failed', error: err.message });
  }
};


/**
 * STEP 3: List branches
 */
exports.getBranchesByOrg = async (req, res) => {
  const { organization_id } = req.params;

  try {
    const [rows] = await pool.promise().execute(
      'SELECT * FROM branches WHERE organization_id = ?',
      [organization_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ Fetch branches error:', err);
    res.status(500).json({ message: 'Failed to fetch branches', error: err.message });
  }
};
