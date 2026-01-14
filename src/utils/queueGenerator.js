const pool = require('../config/db');

class QueueGenerator {
    // Generate daily queue number (Q-001, Q-002, etc.)
    static async generateQueueNumber(organizationId, branchId) {
        const today = new Date().toISOString().split('T')[0];
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            // Get or create daily counter
            const [counter] = await connection.execute(
                `INSERT INTO daily_queue_counter 
                 (queue_date, organization_id, branch_id, last_queue_number) 
                 VALUES (?, ?, ?, 1)
                 ON DUPLICATE KEY UPDATE 
                 last_queue_number = last_queue_number + 1`,
                [today, organizationId, branchId]
            );
            
            // Get the new sequence number
            const [result] = await connection.execute(
                `SELECT last_queue_number 
                 FROM daily_queue_counter 
                 WHERE queue_date = ? AND organization_id = ? AND branch_id = ?`,
                [today, organizationId, branchId]
            );
            
            const sequence = result[0].last_queue_number;
            const queueNumber = `Q-${sequence.toString().padStart(3, '0')}`;
            
            await connection.commit();
            return {
                queueNumber,
                queueDate: today,
                dailySequence: sequence
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Generate parent username (P2024001, P2024002, etc.)
    static async generateParentUsername(organizationId, branchId) {
        const year = new Date().getFullYear();
        const connection = await pool.getConnection();
        
        try {
            // Get the next sequence for this year
            const [result] = await connection.execute(
                `SELECT MAX(CAST(SUBSTRING(username, 2) AS UNSIGNED)) as max_seq 
                 FROM users 
                 WHERE username LIKE 'P${year}%' 
                 AND organization_id = ? 
                 AND branch_id = ?`,
                [organizationId, branchId]
            );
            
            const nextSeq = (result[0].max_seq || 0) + 1;
            const username = `P${year}${nextSeq.toString().padStart(3, '0')}`;
            
            return username;
        } finally {
            connection.release();
        }
    }
}

module.exports = QueueGenerator;