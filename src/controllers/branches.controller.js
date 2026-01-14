const pool = require('../config/db');
//CREATE – Submit Branch KYC
exports.createBranchKYC = async (req, res) => {
    try {
        if (req.user.role !== 'Super_Admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const {
            branch_id,
            owner_full_name,
            owner_national_id,
            owner_document_type,
            owner_document_number,
            document_front_url,
            document_back_url,
            selfie_url
        } = req.body;


        if (!branch_id || !owner_full_name || !owner_document_type || !owner_document_number) {
            return res.status(400).json({ message: 'Required Fields Missing' })
        }


        const [existing] = await pool.promise().execute(
            'SELECT id FROM branches_kyc WHERE branch_id = ?',
            [branch_id]
        );

        if (existing.length > 0) {
            return res.status(409).json({ message: 'Branch KYC already exists' });
        }


        await pool.promise().execute(
            `INSERT INTO branches_kyc
     (branch_id, owner_full_name, owner_national_id, owner_document_type, owner_document_number,
     document_front_url, document_back_url, selfie_url, verification_status, submitted_at)
     
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', Now())`,

            [
                branch_id,
                owner_full_name,
                owner_national_id,
                owner_document_type,
                owner_document_number,
                document_front_url,
                document_back_url,
                selfie_url
            ]
        );

        res.status(201).json({ message: 'Branch KYC Created' });

    } catch (err) {
        console.error('Create Branch KYC Error:', err); // Add logging
        console.error('Create Branch KYC Error:', err);
        console.error('SQL Error Code:', err.code);
        console.error('SQL Error Message:', err.sqlMessage);
        res.status(500).json({
            message: 'Create Branch KYC failed',
            error: err.message,
            sqlError: err.sqlMessage
        });
    }
};



//2READ – Get Branch KYC (by branch_id)
exports.getBranchKYC = async (req, res) => {
    try {
        const { branchId } = req.params;

        const organizationId = req.user.organization_id;

        if (!organizationId) {
            return res.status(400).json({ message: 'Organization ID not found in user data' });
        }



        const [rows] = await pool.promise().execute(
            `SELECT bk.*, b.name AS branch_name
             FROM branches_kyc bk
             JOIN branches b ON b.id = bk.branch_id
             WHERE bk.branch_id = ? AND b.organization_id = ?`,
            [branchId, organizationId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Branch KYC not found' });
        }

        res.json(rows[0]);

    } catch (error) {
        console.error('Fetch Branch KYC Error:', error);
        res.status(500).json({ message: 'Fetch branch kyc failed', error: error.message });
    }
};


//READ – List All Branch KYCs (Admin)
exports.getAllBranchKYCs = async (req, res) => {
    try {
        if (req.user.role !== 'Super_Admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const organizationId = req.user.organization_id;

        if (!organizationId) {
            return res.status(400).json({ message: 'Organization ID not found in user data' });
        }

        const [rows] = await pool.promise().execute(
            `SELECT bk.*, b.name AS branch_name
       FROM branches_kyc bk
       JOIN branches b ON b.id = bk.branch_id
       WHERE b.organization_id = ?
       ORDER BY bk.submitted_at DESC`,
            [organizationId]
        );

        res.json(rows);
    } catch (err) {
        console.error('Fetch Branch KYCs Error:', err);
        res.status(500).json({ message: 'Fetch Branch KYCs failed', error: err.message });
    }
};


//UPDATE – Edit Branch KYC (Only if pending)
exports.updateBranchKYC = async (req, res) => {
    try {
        const { branchId } = req.params;
        const {
            owner_full_name,
            owner_national_id,
            owner_document_type,
            owner_document_number,
            document_front_url,
            document_back_url,
            selfie_url
        } = req.body;

        const [existing] = await pool.promise().execute(
            'SELECT verification_status FROM branches_kyc WHERE branch_id = ?',
            [branchId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ message: 'Branch KYC not found' });
        }

        if (existing[0].verification_status !== 'pending') {
            return res.status(400).json({
                message: 'Cannot update verified or rejected KYC'
            });
        }

        await pool.promise().execute(
            `UPDATE branches_kyc SET
        owner_full_name = ?,
        owner_national_id = ?,
        owner_document_type = ?,
        owner_document_number = ?,
        document_front_url = ?,
        document_back_url = ?,
        selfie_url = ?
       WHERE branch_id = ?`,
            [
                owner_full_name,
                owner_national_id,
                owner_document_type,
                owner_document_number,
                document_front_url,
                document_back_url,
                selfie_url,
                branchId
            ]
        );

        res.json({ message: 'Branch KYC updated' });
    } catch (err) {
        res.status(500).json({ message: 'Update Branch KYC failed' });
    }
};



//VERIFY / REJECT – Admin Action
exports.verifyBranchKYC = async (req, res) => {
    try {
        if (req.user.role !== 'Super_Admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const { branchId } = req.params;
        const { status } = req.body; // verified | rejected
        const organizationId = req.user.organization_id;



        if (!['verified', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const [result] = await pool.promise().execute(
            `UPDATE branches_kyc bk
       JOIN branches b ON b.id = bk.branch_id
       SET bk.verification_status = ?,
           bk.verified_by = ?,
           bk.verified_at = NOW()
       WHERE bk.branch_id = ? AND b.organization_id = ?`,
            [status, req.user.id, branchId, organizationId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Branch KYC not found or not in your organization' });
        }

        res.json({ message: `Branch KYC ${status}` });
    } catch (err) {
        console.error('Verification Error:', err);
        res.status(500).json({ message: 'Verification failed', error: err.message });
    }
};


//DELETE – Remove Branch KYC (Optional)
exports.deleteBranchKYC = async (req, res) => {
    try {
        if (req.user.role !== 'Super_Admin') {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const { branchId } = req.params;
        const organizationId = req.user.organization_id;

        const [result] = await pool.promise().execute(
            `DELETE bk FROM branches_kyc bk
       JOIN branches b ON b.id = bk.branch_id
       WHERE bk.branch_id = ? AND b.organization_id = ?`,
            [branchId, organizationId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Branch KYC not found or not in your organization' });
        }

        res.json({ message: 'Branch KYC deleted' });
    } catch (err) {
        console.error('Delete KYC Error:', err);
        res.status(500).json({ message: 'Delete Branch KYC failed', error: err.message });
    }
};


