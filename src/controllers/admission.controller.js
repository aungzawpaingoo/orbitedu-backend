const pool = require('../config/db');
const QueueGenerator = require('../utils/queueGenerator');

// ==================== PARENT: SUBMIT FORM ====================
exports.submitAdmissionForm = async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { organizationId, branchId, formData } = req.body;
        
        console.log('🎯 PARENT FORM SUBMISSION (COMPLETE DATA):');
        console.log('Organization:', organizationId);
        console.log('Branch:', branchId);
        console.log('COMPLETE FORM DATA:', JSON.stringify(formData, null, 2));
        
        // 1. Create parent record with ALL form data
        const [parentResult] = await connection.execute(
            `INSERT INTO parents (
                organization_id, branch_id,
                father_name, father_nationality, father_phone, father_email,
                father_passport, father_company, father_position,
                mother_name, mother_nationality, mother_phone, mother_email,
                mother_passport, mother_company, mother_position,
                guardian_name, guardian_relation, guardian_nationality,
                guardian_phone, guardian_email, guardian_business,
                address, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'form_submitted')`,
            [
                organizationId, branchId,
                formData.fatherName, formData.fatherNationality, formData.fatherPhone, formData.fatherEmail,
                formData.fatherPassport, formData.fatherCompany, formData.fatherPosition,
                formData.motherName, formData.motherNationality, formData.motherPhone, formData.motherEmail,
                formData.motherPassport, formData.motherCompany, formData.motherPosition,
                formData.guardianName, formData.guardianRelation, formData.guardianNationality,
                formData.guardianPhone, formData.guardianEmail, formData.guardianBusiness,
                formData.fatherAddress
            ]
        );
        
        const parentId = parentResult.insertId;
        
        // 2. Create student record with ALL student data
        const [studentResult] = await connection.execute(
            `INSERT INTO students (
                parent_id, organization_id, branch_id,
                student_name, grade_applying, gender, date_of_birth,
                nationality, religion, nrc_number,
                has_sibling, sibling_name, sibling_grade,
                medical_condition, allergies, blood_group,
                emergency_contact_name, emergency_contact_phone,
                school_history
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                parentId, organizationId, branchId,
                formData.studentName, formData.studentGrade, formData.studentGender,
                formData.studentDOB, formData.studentNationality, formData.studentReligion,
                formData.studentNRC,
                formData.hasSibling, formData.siblingName, formData.siblingGrade,
                formData.medicalCondition, formData.allergies, formData.bloodGroup,
                formData.emergencyName, formData.emergencyPhone,
                JSON.stringify([
                    { school: formData.school1Name, from: formData.school1From, to: formData.school1To },
                    { school: formData.school2Name, from: formData.school2From, to: formData.school2To },
                    { school: formData.school3Name, from: formData.school3From, to: formData.school3To }
                ])
            ]
        );
        
        const studentId = studentResult.insertId;
        
        // 3. Generate queue number
        const queueInfo = await QueueGenerator.generateQueueNumber(organizationId, branchId);
        
        // 4. Add to admission queue
        await connection.execute(
            `INSERT INTO admission_queue 
             (organization_id, branch_id, parent_id, student_id, 
              queue_number, queue_date, daily_sequence, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'waiting')`,
            [
                organizationId, branchId, parentId, studentId,
                queueInfo.queueNumber, queueInfo.queueDate, queueInfo.dailySequence
            ]
        );
        
        // 5. Update parent status
        await connection.execute(
            `UPDATE parents SET status = 'in_queue' WHERE id = ?`,
            [parentId]
        );
        
        await connection.commit();
        
        console.log('✅ FORM SUBMITTED SUCCESSFULLY');
        console.log('Queue Number:', queueInfo.queueNumber);
        console.log('Parent ID:', parentId);
        console.log('Student ID:', studentId);
        
        res.json({
            success: true,
            message: 'Admission form submitted successfully',
            data: {
                queueNumber: queueInfo.queueNumber,
                queueDate: queueInfo.queueDate,
                position: queueInfo.dailySequence,
                message: `Your queue number is ${queueInfo.queueNumber}. Please wait for your turn. The screen will vibrate when it's your turn.`
            }
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Submit form error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit admission form',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

// ==================== PARENT: CHECK QUEUE STATUS ====================
exports.checkQueueStatus = async (req, res) => {
    try {
        const { queueNumber } = req.params;
        
        const [queueInfo] = await pool.execute(
            `SELECT 
                aq.queue_number,
                aq.status as queue_status,
                aq.daily_sequence as position,
                aq.counter_number,
                aq.called_at,
                p.status as parent_status,
                (SELECT COUNT(*) FROM admission_queue 
                 WHERE queue_date = aq.queue_date 
                 AND organization_id = aq.organization_id
                 AND branch_id = aq.branch_id
                 AND status IN ('waiting', 'called', 'processing')
                 AND daily_sequence < aq.daily_sequence) as ahead_in_queue
             FROM admission_queue aq
             JOIN parents p ON aq.parent_id = p.id
             WHERE aq.queue_number = ?`,
            [queueNumber]
        );
        
        if (queueInfo.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Queue number not found'
            });
        }
        
        const data = queueInfo[0];
        
        // Check if it's their turn (for mobile vibration)
        const isTheirTurn = data.queue_status === 'called' && data.ahead_in_queue === 0;
        
        res.json({
            success: true,
            data: {
                queueNumber: data.queue_number,
                queueStatus: data.queue_status,
                parentStatus: data.parent_status,
                position: data.position,
                aheadInQueue: data.ahead_in_queue,
                counterNumber: data.counter_number,
                calledAt: data.called_at,
                isTheirTurn: isTheirTurn,
                shouldVibrate: isTheirTurn,
                message: getStatusMessage(data.queue_status, data.parent_status)
            }
        });
    } catch (error) {
        console.error('Check queue error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check queue status',
            error: error.message
        });
    }
};

function getStatusMessage(queueStatus, parentStatus) {
    switch(parentStatus) {
        case 'in_queue':
            return 'Waiting in queue. Please have a seat.';
        case 'at_counter':
            return 'Please proceed to the counter.';
        case 'under_review':
            return 'Your admission is under review.';
        case 'approved':
            return 'Admission approved! Account details will be provided soon.';
        case 'account_created':
            return 'Your account has been created. Please check your email/SMS for login details.';
        case 'rejected':
            return 'Admission has been rejected. Contact admin for details.';
        default:
            return 'Waiting for processing...';
    }
}

// ==================== ADMIN: QUEUE MANAGEMENT ====================

// Get all today's admissions for admin dashboard
exports.getAdminDashboard = async (req, res) => {
    try {
        const { organization_id: organizationId, branch_id: branchId } = req.user;
        const today = new Date().toISOString().split('T')[0];
        
        // Get all admissions for today
        const [admissions] = await pool.execute(
            `SELECT 
                aq.id as queue_id,
                aq.queue_number,
                aq.daily_sequence,
                aq.status as queue_status,
                aq.counter_number,
                aq.called_at,
                aq.completed_at,
                p.id as parent_id,
                p.status as parent_status,
                p.father_name,
                p.father_phone,
                p.created_at as submitted_at,
                s.student_name,
                s.grade_applying,
                s.gender
             FROM admission_queue aq
             JOIN parents p ON aq.parent_id = p.id
             JOIN students s ON aq.student_id = s.id
             WHERE aq.queue_date = ?
             AND aq.organization_id = ?
             AND aq.branch_id = ?
             ORDER BY aq.daily_sequence ASC`,
            [today, organizationId, branchId]
        );
        
        // Get statistics
        const [stats] = await pool.execute(
            `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN aq.status = 'waiting' THEN 1 ELSE 0 END) as waiting,
                SUM(CASE WHEN aq.status = 'called' THEN 1 ELSE 0 END) as called,
                SUM(CASE WHEN aq.status = 'processing' THEN 1 ELSE 0 END) as processing,
                SUM(CASE WHEN aq.status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN p.status = 'approved' THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN p.status = 'account_created' THEN 1 ELSE 0 END) as account_created
             FROM admission_queue aq
             JOIN parents p ON aq.parent_id = p.id
             WHERE aq.queue_date = ?
             AND aq.organization_id = ?
             AND aq.branch_id = ?`,
            [today, organizationId, branchId]
        );
        
        res.json({
            success: true,
            data: {
                admissions,
                stats: stats[0],
                today: today
            }
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to load dashboard',
            error: error.message
        });
    }
};

// Admin: Call next in queue
exports.callNextToCounter = async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { organizationId, branchId } = req.user;
        const { counterNumber } = req.body;
        const today = new Date().toISOString().split('T')[0];
        
        // Find next waiting in queue
        const [nextQueue] = await connection.execute(
            `SELECT id, queue_number, parent_id 
             FROM admission_queue
             WHERE queue_date = ?
             AND organization_id = ?
             AND branch_id = ?
             AND status = 'waiting'
             ORDER BY daily_sequence ASC
             LIMIT 1 FOR UPDATE`,
            [today, organizationId, branchId]
        );
        
        if (nextQueue.length === 0) {
            return res.json({
                success: false,
                message: 'No one waiting in queue'
            });
        }
        
        const queueItem = nextQueue[0];
        
        // Update queue status
        await connection.execute(
            `UPDATE admission_queue 
             SET status = 'called',
                 counter_number = ?,
                 called_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [counterNumber, queueItem.id]
        );
        
        // Update parent status
        await connection.execute(
            `UPDATE parents 
             SET status = 'at_counter'
             WHERE id = ?`,
            [queueItem.parent_id]
        );
        
        await connection.commit();
        
        res.json({
            success: true,
            message: `Called ${queueItem.queue_number} to counter ${counterNumber}`,
            data: {
                queueNumber: queueItem.queue_number,
                queueId: queueItem.id
            }
        });
    } catch (error) {
        await connection.rollback();
        console.error('Call next error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to call next in queue',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

// Admin: Mark as counter completed
exports.markCounterCompleted = async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { queueId } = req.body;
        const adminId = req.user.id;
        
        // Update queue status
        await connection.execute(
            `UPDATE admission_queue 
             SET status = 'completed',
                 completed_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [queueId]
        );
        
        // Get parent ID
        const [queueInfo] = await connection.execute(
            `SELECT parent_id FROM admission_queue WHERE id = ?`,
            [queueId]
        );
        
        if (queueInfo.length === 0) {
            throw new Error('Queue not found');
        }
        
        const parentId = queueInfo[0].parent_id;
        
        // Update parent status to under review
        await connection.execute(
            `UPDATE parents 
             SET status = 'under_review'
             WHERE id = ?`,
            [parentId]
        );
        
        // Create review record
        await connection.execute(
            `INSERT INTO admission_reviews 
             (parent_id, student_id, organization_id, branch_id, reviewed_by, status) 
             SELECT 
                p.id, s.id, p.organization_id, p.branch_id, ?, 'pending'
             FROM parents p
             JOIN students s ON p.id = s.parent_id
             WHERE p.id = ?`,
            [adminId, parentId]
        );
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Counter process completed. Admission sent for review.'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Mark completed error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark as completed',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

// ==================== ADMIN: ADMISSION REVIEW ====================

// Get pending reviews
exports.getPendingReviews = async (req, res) => {
    try {
        const { organizationId, branchId } = req.user;
        
        const [reviews] = await pool.execute(
            `SELECT 
                ar.id as review_id,
                ar.status as review_status,
                ar.created_at as review_date,
                p.id as parent_id,
                p.father_name,
                p.father_phone,
                p.father_email,
                p.mother_name,
                p.mother_phone,
                p.address,
                s.student_name,
                s.grade_applying,
                s.gender,
                s.date_of_birth,
                s.nationality,
                s.medical_condition,
                s.allergies,
                s.blood_group,
                s.school_history
             FROM admission_reviews ar
             JOIN parents p ON ar.parent_id = p.id
             JOIN students s ON ar.student_id = s.id
             WHERE ar.organization_id = ?
             AND ar.branch_id = ?
             AND ar.status = 'pending'
             ORDER BY ar.created_at ASC`,
            [organizationId, branchId]
        );
        
        res.json({
            success: true,
            data: reviews
        });
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get pending reviews',
            error: error.message
        });
    }
};

// Admin: Approve admission and create account
exports.approveAdmission = async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { reviewId } = req.body;
        const adminId = req.user.id;
        
        // 1. Get review details
        const [review] = await connection.execute(
            `SELECT ar.*, p.father_name, p.father_phone, p.organization_id, p.branch_id
             FROM admission_reviews ar
             JOIN parents p ON ar.parent_id = p.id
             WHERE ar.id = ?`,
            [reviewId]
        );
        
        if (review.length === 0) {
            throw new Error('Review not found');
        }
        
        const rev = review[0];
        
        // 2. Update review status
        await connection.execute(
            `UPDATE admission_reviews 
             SET status = 'approved',
                 reviewed_by = ?,
                 reviewed_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [adminId, reviewId]
        );
        
        // 3. Update parent status
        await connection.execute(
            `UPDATE parents 
             SET status = 'approved'
             WHERE id = ?`,
            [rev.parent_id]
        );
        
        // 4. Generate username (P2024001)
        const year = new Date().getFullYear();
        const [maxUser] = await connection.execute(
            `SELECT MAX(CAST(SUBSTRING(username, 2) AS UNSIGNED)) as max_seq 
             FROM users 
             WHERE username LIKE 'P${year}%' 
             AND organization_id = ? 
             AND branch_id = ?`,
            [rev.organization_id, rev.branch_id]
        );
        
        const nextSeq = (maxUser[0].max_seq || 0) + 1;
        const username = `P${year}${nextSeq.toString().padStart(3, '0')}`;
        
        // 5. Generate temporary 6-digit PIN
        const tempPin = Math.floor(100000 + Math.random() * 900000).toString();
        
        // 6. Create user account in your existing users table
        const [userResult] = await connection.execute(
            `INSERT INTO users 
             (name, username, password, role, organization_id, branch_id) 
             VALUES (?, ?, ?, 'parent', ?, ?)`,
            [
                rev.father_name || 'Parent',
                username,
                tempPin, // Note: You should hash this based on your existing auth system
                rev.organization_id,
                rev.branch_id
            ]
        );
        
        const userId = userResult.insertId;
        
        // 7. Link parent to user account
        await connection.execute(
            `UPDATE parents 
             SET user_id = ?, status = 'account_created'
             WHERE id = ?`,
            [userId, rev.parent_id]
        );
        
        // 8. Update student status
        await connection.execute(
            `UPDATE students 
             SET admission_status = 'approved'
             WHERE parent_id = ?`,
            [rev.parent_id]
        );
        
        await connection.commit();
        
        console.log('✅ ADMISSION APPROVED & ACCOUNT CREATED:');
        console.log('Parent:', rev.father_name);
        console.log('Username:', username);
        console.log('Temporary PIN:', tempPin);
        console.log('User ID:', userId);
        
        res.json({
            success: true,
            message: 'Admission approved and account created',
            data: {
                parentName: rev.father_name,
                phone: rev.father_phone,
                username: username,
                temporaryPin: tempPin,
                instructions: `Provide these credentials to parent: Username: ${username}, PIN: ${tempPin}`
            }
        });
        
    } catch (error) {
        await connection.rollback();
        console.error('Approve admission error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to approve admission',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

// Admin: Reject admission
exports.rejectAdmission = async (req, res) => {
    try {
        const { reviewId, remarks } = req.body;
        const adminId = req.user.id;
        
        // Update review status
        await pool.execute(
            `UPDATE admission_reviews 
             SET status = 'rejected',
                 reviewed_by = ?,
                 reviewed_at = CURRENT_TIMESTAMP,
                 remarks = ?
             WHERE id = ?`,
            [adminId, remarks, reviewId]
        );
        
        // Get parent ID from review
        const [review] = await pool.execute(
            `SELECT parent_id FROM admission_reviews WHERE id = ?`,
            [reviewId]
        );
        
        if (review.length > 0) {
            // Update parent status
            await pool.execute(
                `UPDATE parents 
                 SET status = 'rejected'
                 WHERE id = ?`,
                [review[0].parent_id]
            );
            
            // Update student status
            await pool.execute(
                `UPDATE students 
                 SET admission_status = 'rejected'
                 WHERE parent_id = ?`,
                [review[0].parent_id]
            );
        }
        
        res.json({
            success: true,
            message: 'Admission rejected'
        });
    } catch (error) {
        console.error('Reject admission error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject admission',
            error: error.message
        });
    }
};