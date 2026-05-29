import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { ExpensesController } from './expenses.controller';

const router = Router();

router.get('/', authenticate, ExpensesController.list);
router.post('/', authenticate, ExpensesController.create);
router.get('/merchants', authenticate, ExpensesController.getMerchants);
router.get('/export/csv', authenticate, ExpensesController.exportCsv);
router.get('/stats/summary', authenticate, ExpensesController.getSummary);
router.get('/:id', authenticate, ExpensesController.getOne);
router.patch('/:id', authenticate, ExpensesController.update);
router.delete('/:id', authenticate, ExpensesController.remove);

export default router;
