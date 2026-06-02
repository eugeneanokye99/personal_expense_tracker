import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { AchievementsController } from './achievements.controller';

const router = Router();

router.get('/', authenticate, AchievementsController.list);
router.post('/unlock', authenticate, AchievementsController.unlock);

export default router;
