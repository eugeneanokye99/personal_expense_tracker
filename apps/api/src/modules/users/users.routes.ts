import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { UsersController } from './users.controller';

const router = Router();

router.get('/me', authenticate, UsersController.getMe);
router.patch('/me', authenticate, UsersController.updateMe);
router.delete('/me', authenticate, UsersController.deleteMe);

export default router;
