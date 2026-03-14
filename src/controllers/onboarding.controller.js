const pool = require('../config/db');

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

    // // Validation
    // if (!organization_id || !name || !location || !address || !city || !country || !billing_start_date) {
    //   return res.status(400).json({ message: 'All required fields must be provided' });
    // }

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


exports.getOrganizationsWithBranches = async (req, res) => {
  try {
    // This query gets organizations and their linked branches
    const [rows] = await pool.promise().execute(`
      SELECT 
        o.id as org_id, 
        o.name as org_name, 
        b.id as branch_id, 
        b.name as branch_name,
        b.city as branch_city
      FROM organizations o
      LEFT JOIN branches b ON o.id = b.organization_id
      WHERE o.status = 'active' OR o.status = 'pending'
    `);

    // Grouping the flat SQL result into a nested JSON structure
    const organizations = rows.reduce((acc, row) => {
      const { org_id, org_name, branch_id, branch_name, branch_city } = row;

      if (!acc[org_id]) {
        acc[org_id] = {
          label: org_name,
          value: org_id.toString(),
          image: 'https://via.placeholder.com/150', // Default image or add image column to DB
          branches: []
        };
      }

      if (branch_id) {
        acc[org_id].branches.push({
          // label: `${branch_name} _ (${branch_city})`,
          label: `${branch_name}`,

          value: branch_id.toString()
        });
      }

      return acc;
    }, {});

    res.json(Object.values(organizations));
  } catch (err) {
    console.error('❌ Fetch schools error:', err);
    res.status(500).json({ message: 'Failed to fetch schools' });
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
