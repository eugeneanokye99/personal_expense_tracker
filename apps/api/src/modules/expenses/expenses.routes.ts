import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/authenticate';
import { ExpensesController } from './expenses.controller';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
});

router.get('/', authenticate, ExpensesController.list);
router.post('/', authenticate, ExpensesController.create);
router.post('/upload-statement', authenticate, upload.single('statement'), ExpensesController.uploadStatement);
router.get('/merchants', authenticate, ExpensesController.getMerchants);
router.get('/export/csv', authenticate, ExpensesController.exportCsv);
router.get('/stats/summary', authenticate, ExpensesController.getSummary);
router.get('/:id', authenticate, ExpensesController.getOne);
router.patch('/:id', authenticate, ExpensesController.update);
router.delete('/:id', authenticate, ExpensesController.remove);

export default router;
