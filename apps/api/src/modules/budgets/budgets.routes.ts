import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { BudgetsController } from './budgets.controller';

const router = Router();

router.get('/', authenticate, BudgetsController.list);
router.post('/', authenticate, BudgetsController.upsert);
router.get('/overview', authenticate, BudgetsController.overview);
router.delete('/:id', authenticate, BudgetsController.remove);

export default router;
