// const AttendanceModel = require('../models/attendanceModel');

// // Helper to get current date formatted (YYYY-MM-DD)
// const getTodayDate = () => new Date().toISOString().split('T')[0];

// // Helper to get current time (HH:MM:SS)
// const getNowTime = () => new Date().toTimeString().split(' ')[0];

// // CONFIG: Default start time
// const SCHOOL_START_TIME = '08:00:00'; 

// exports.checkIn = async (req, res) => {
//     try {
//         const { id: userId, organization_id, branch_id } = req.user;
//         const { latitude, longitude, device_info, remarks } = req.body;
        
//         const today = getTodayDate();
//         const now = getNowTime();

//         const existing = await AttendanceModel.findTodayAttendance(userId, today);
//         if (existing) {
//             return res.status(400).json({ message: 'You have already checked in today.' });
//         }

//         let status = 'present';
//         let is_late = 0;
//         let late_minutes = 0;

//         if (now > SCHOOL_START_TIME) {
//             status = 'late';
//             is_late = 1;
//         }

//         await AttendanceModel.checkIn({
//             organization_id,
//             branch_id: branch_id || null,
//             user_id: userId,
//             date: today,
//             check_in_time: now,
//             status,
//             is_late,
//             late_minutes,
//             latitude: latitude || null,
//             longitude: longitude || null,
//             ip_address: req.ip || req.connection.remoteAddress,
//             device_info: device_info || 'Unknown',
//             remarks: remarks || null
//         });

//         res.status(201).json({ 
//             message: 'Check-in successful', 
//             data: { check_in: now, status, is_late } 
//         });

//     } catch (error) {
//         console.error('Check-in Error:', error);
//         res.status(500).json({ message: 'Server error during check-in' });
//     }
// };

// exports.checkOut = async (req, res) => {
//     try {
//         const { id: userId } = req.user;
//         const { latitude, longitude } = req.body;
//         const today = getTodayDate();
//         const now = getNowTime();

//         const existing = await AttendanceModel.findTodayAttendance(userId, today);
//         if (!existing) {
//             return res.status(400).json({ message: 'No check-in record found for today.' });
//         }

//         await AttendanceModel.checkOut(userId, today, {
//             check_out_time: now,
//             latitude: latitude || null,
//             longitude: longitude || null
//         });

//         res.status(200).json({ 
//             message: 'Check-out successful', 
//             data: { check_out: now } 
//         });

//     } catch (error) {
//         console.error('Check-out Error:', error);
//         res.status(500).json({ message: 'Server error during check-out' });
//     }
// };

// exports.getMyHistory = async (req, res) => {
//     try {
//         const { id: userId, organization_id } = req.user;
//         const history = await AttendanceModel.getHistory(userId, organization_id);
//         res.json(history);
//     } catch (error) {
//         console.error('History Error:', error);
//         res.status(500).json({ message: 'Error fetching history' });
//     }
// }; // <--- I CLOSED THIS BRACKET HERE. IT WAS MISSING IN YOUR CODE.

// // Now this function is OUTSIDE, so it is exported correctly
// exports.getDailyAttendance = async (req, res) => {
//     try {
//         const { organization_id } = req.user; 
//         const date = req.query.date || getTodayDate();

//         const report = await AttendanceModel.getDailyReport(organization_id, date);
//         res.json(report);
//     } catch (error) {
//         console.error('Admin Report Error:', error);
//         res.status(500).json({ message: 'Error fetching daily attendance' });
//     }
// };



const AttendanceModel = require('../models/attendanceModel');

// Helper: Get today's date (YYYY-MM-DD)
const getTodayDate = () => new Date().toISOString().split('T')[0];

// Helper: Get FULL DateTime for MySQL (YYYY-MM-DD HH:MM:SS)
// This fixes the "Incorrect datetime value" error
const getFullDateTime = () => {
    const now = new Date();
    // adjust to your timezone if needed, currently uses server local time
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// CONFIG: Default start time 
const SCHOOL_START_TIME = '08:00:00'; 

exports.checkIn = async (req, res) => {
    try {
        const { id: userId, organization_id, branch_id } = req.user;
        const { latitude, longitude, device_info, remarks } = req.body;
        
        const today = getTodayDate();
        const nowFull = getFullDateTime(); // '2025-12-13 21:50:00'
        
        // Extract just the time part for logic checks
        const nowTimeOnly = nowFull.split(' ')[1]; 

        const existing = await AttendanceModel.findTodayAttendance(userId, today);
        if (existing) {
            return res.status(400).json({ message: 'You have already checked in today.' });
        }

        let status = 'present';
        let is_late = 0;
        let late_minutes = 0;

        if (nowTimeOnly > SCHOOL_START_TIME) {
            status = 'late';
            is_late = 1;
        }

        const newId = await AttendanceModel.checkIn({
            organization_id,
            branch_id: branch_id || null,
            user_id: userId,
            date: today,
            check_in_time: nowFull, // <--- SENDING FULL DATETIME NOW
            status,
            is_late,
            late_minutes,
            latitude: latitude || null,
            longitude: longitude || null,
            ip_address: req.ip || req.connection.remoteAddress,
            device_info: device_info || 'Unknown',
            remarks: remarks || null
        });

        res.status(201).json({ 
            message: 'Check-in successful', 
            data: { check_in: nowFull, status, is_late } 
        });

    } catch (error) {
        console.error('Check-in Error:', error);
        res.status(500).json({ message: 'Server error during check-in' });
    }
};

exports.checkOut = async (req, res) => {
    try {
        const { id: userId } = req.user;
        const { latitude, longitude } = req.body;
        const today = getTodayDate();
        const nowFull = getFullDateTime();

        const existing = await AttendanceModel.findTodayAttendance(userId, today);
        if (!existing) {
            return res.status(400).json({ message: 'No check-in record found for today.' });
        }

        await AttendanceModel.checkOut(userId, today, {
            check_out_time: nowFull, // <--- SENDING FULL DATETIME
            latitude: latitude || null,
            longitude: longitude || null
        });

        res.status(200).json({ 
            message: 'Check-out successful', 
            data: { check_out: nowFull } 
        });

    } catch (error) {
        console.error('Check-out Error:', error);
        res.status(500).json({ message: 'Server error during check-out' });
    }
};

exports.getMyHistory = async (req, res) => {
    try {
        const { id: userId, organization_id } = req.user;
        const history = await AttendanceModel.getHistory(userId, organization_id);
        res.json(history);
    } catch (error) {
        console.error('History Error:', error);
        res.status(500).json({ message: 'Error fetching history' });
    }
};

exports.getDailyAttendance = async (req, res) => {
    try {
        const { organization_id } = req.user; 
        const date = req.query.date || getTodayDate();
        const report = await AttendanceModel.getDailyReport(organization_id, date);
        res.json(report);
    } catch (error) {
        console.error('Admin Report Error:', error);
        res.status(500).json({ message: 'Error fetching daily attendance' });
    }
};