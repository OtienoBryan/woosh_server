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

// Staff routes - removed /staff prefix since mounted at /api/staff
router.get('/', staffController.getAllStaff);
router.get('/:id', staffController.getStaffById);
router.post('/', staffController.createStaff);
router.put('/:id', staffController.editStaff);
router.delete('/:id', staffController.deleteStaff);
router.patch('/:id/status', staffController.updateStaffStatus);
router.patch('/:id/deactivate', staffController.deactivateStaff);

// Employee document routes
router.post('/:id/documents', upload.single('file'), staffController.uploadDocument);
router.get('/:id/documents', staffController.getDocuments);
router.delete('/documents/:docId', staffController.deleteDocument);

// Document upload route
router.post('/documents', upload.single('file'), documentController.uploadDocument);

// List documents
router.get('/documents', documentController.getAllDocuments);

// Employee contract routes
router.post('/:id/contracts', upload.single('file'), staffController.uploadContract);
router.get('/:id/contracts', staffController.getContracts);
router.post('/contracts/:contractId/renew', upload.single('file'), staffController.renewContract);
router.get('/contracts/expiring', staffController.getExpiringContracts);

// Termination Letters
router.post('/:id/termination-letters', upload.single('file'), staffController.uploadTerminationLetter);
router.get('/:id/termination-letters', staffController.getTerminationLetters);

// Warning Letters
router.post('/:id/warning-letters', upload.single('file'), staffController.uploadWarningLetter);
router.get('/:id/warning-letters', staffController.getWarningLetters);

// Employee warning routes
router.post('/:id/warnings', staffController.postWarning);
router.get('/:id/warnings', staffController.getWarnings);
router.delete('/warnings/:warningId', staffController.deleteWarning);

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

// Employee working routes
router.get('/employee-working-hours', staffController.getEmployeeWorkingHours);
router.get('/employee-working-days', staffController.getEmployeeWorkingDays);
router.get('/out-of-office-requests', staffController.getOutOfOfficeRequests);

module.exports = router; 