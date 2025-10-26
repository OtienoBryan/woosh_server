const express = require('express');
const router = express.Router();
const noticeController = require('../controllers/noticeController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all notice routes
router.use(authenticateToken);

router.get('/countries', noticeController.getCountries);
router.get('/', noticeController.getAllNotices);
router.get('/:id', noticeController.getNoticeById);
router.post('/', noticeController.createNotice);
router.put('/:id', noticeController.updateNotice);
router.delete('/:id', noticeController.deleteNotice);
router.delete('/all', noticeController.deleteAllNotices);
router.patch('/:id/archive', noticeController.archiveNotice);

module.exports = router; 