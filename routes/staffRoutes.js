const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const attendanceController = require('../controllers/attendanceController');
const departmentController = require('../controllers/departmentController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const documentController = require('../controllers/documentController');
const calendarTaskController = require('../controllers/calendarTaskController');
//const upload = multer({ dest: 'http://www.citlogisticssystems.com/woosh/admin/upload/staff/' });

// Staff routes
router.get('/staff', staffController.getAllStaff);
router.get('/staff/:id', staffController.getStaffById);
router.post('/staff', staffController.createStaff);
router.put('/staff/:id', staffController.editStaff);
router.delete('/staff/:id', staffController.deleteStaff);
router.patch('/staff/:id/status', staffController.updateStaffStatus);
router.patch('/staff/:id/deactivate', staffController.deactivateStaff);

// Employee document routes
router.post('/staff/:id/documents', upload.single('file'), staffController.uploadDocument);
router.get('/staff/:id/documents', staffController.getDocuments);
router.delete('/staff/documents/:docId', staffController.deleteDocument);

// Document upload route
router.post('/documents', upload.single('file'), documentController.uploadDocument);

// List documents
router.get('/documents', documentController.getAllDocuments);

// Employee contract routes
router.post('/staff/:id/contracts', upload.single('file'), staffController.uploadContract);
router.get('/staff/:id/contracts', staffController.getContracts);
router.post('/staff/contracts/:contractId/renew', upload.single('file'), staffController.renewContract);
router.get('/staff/contracts/expiring', staffController.getExpiringContracts);

// Staff avatar upload
router.post('/staff/:id/avatar', upload.single('avatar'), staffController.uploadAvatar);

// Termination Letters
router.post('/staff/:id/termination-letters', upload.single('file'), staffController.uploadTerminationLetter);
router.get('/staff/:id/termination-letters', staffController.getTerminationLetters);

// Warning Letters
router.post('/staff/:id/warning-letters', upload.single('file'), staffController.uploadWarningLetter);
router.get('/staff/:id/warning-letters', staffController.getWarningLetters);

// Employee warning routes
router.post('/staff/:id/warnings', staffController.postWarning);
router.get('/staff/:id/warnings', staffController.getWarnings);
router.delete('/staff/warnings/:warningId', staffController.deleteWarning);

// HR Calendar Task routes
router.get('/calendar-tasks', calendarTaskController.getTasks);
router.post('/calendar-tasks', calendarTaskController.addTask);
router.delete('/calendar-tasks/:id', calendarTaskController.deleteTask);

// Department routes
router.get('/departments', departmentController.getAllDepartments);
router.post('/departments', departmentController.addDepartment);
router.put('/departments/:id', departmentController.editDepartment);
router.patch('/departments/:id/deactivate', departmentController.deactivateDepartment);

// Attendance routes
router.get('/attendance/today', attendanceController.getTodayAttendance);
router.get('/attendance', attendanceController.getAllAttendance);
router.post('/attendance/checkin', attendanceController.checkIn);
router.post('/attendance/checkout', attendanceController.checkOut);

// GET /api/employee-working-hours
router.get('/employee-working-hours', staffController.getEmployeeWorkingHours);
// GET /api/employee-working-days
router.get('/employee-working-days', staffController.getEmployeeWorkingDays);
// GET /api/out-of-office-requests
router.get('/out-of-office-requests', staffController.getOutOfOfficeRequests);

module.exports = router; 