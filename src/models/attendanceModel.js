const db = require('../config/db');

class AttendanceModel {
    
    // Check if user already checked in today
    static async findTodayAttendance(userId, date) {
        const [rows] = await db.promise().query(
            `SELECT * FROM self_attendance WHERE user_id = ? AND date = ?`,
            [userId, date]
        );
        return rows[0];
    }

    // Create Check-In Record
    static async checkIn(data) {
        const query = `
            INSERT INTO self_attendance 
            (organization_id, branch_id, user_id, date, check_in, status, is_late, late_minutes, check_in_latitude, check_in_longitude, ip_address, device_info, remarks)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const [result] = await db.promise().query(query, [
            data.organization_id,
            data.branch_id,
            data.user_id,
            data.date,
            data.check_in_time,
            data.status,
            data.is_late,
            data.late_minutes,
            data.latitude,
            data.longitude,
            data.ip_address,
            data.device_info,
            data.remarks
        ]);
        return result.insertId;
    }

    // Update Check-Out Record
    static async checkOut(userId, date, data) {
        const query = `
            UPDATE self_attendance 
            SET check_out = ?, 
                check_out_latitude = ?, 
                check_out_longitude = ?,
                status = CASE 
                    WHEN status = 'absent' THEN 'present' 
                    ELSE status 
                END
            WHERE user_id = ? AND date = ?
        `;

        const [result] = await db.promise().query(query, [
            data.check_out_time,
            data.latitude,
            data.longitude,
            userId,
            date
        ]);
        return result.affectedRows;
    }

    // Get History (Limit 30 days)
    static async getHistory(userId, organizationId, limit = 30) {
        const [rows] = await db.promise().query(
            `SELECT * FROM self_attendance 
             WHERE user_id = ? AND organization_id = ? 
             ORDER BY date DESC LIMIT ?`,
            [userId, organizationId, limit]
        );
        return rows;
    }

    // Admin: Get daily report for the whole school
    static async getDailyReport(organizationId, date) {
        const query = `
            SELECT 
                sa.*, 
                u.name, 
                u.role, 
                u.username 
            FROM self_attendance sa
            JOIN users u ON sa.user_id = u.id
            WHERE sa.organization_id = ? AND sa.date = ?
            ORDER BY u.role, u.name ASC
        `;
        const [rows] = await db.promise().query(query, [organizationId, date]);
        return rows;
    }
    
}

module.exports = AttendanceModel;