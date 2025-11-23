const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const departmentExpenseController = require('../controllers/departmentExpenseController');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB
  }
});

router.use(authenticateToken);

router.post('/', upload.single('document'), departmentExpenseController.createDepartmentExpense);
router.get('/', departmentExpenseController.listDepartmentExpenses);
router.patch('/:id/approve-hr', departmentExpenseController.approveByHR);
router.patch('/:id/approve-finance', departmentExpenseController.approveByFinance);

module.exports = router;


