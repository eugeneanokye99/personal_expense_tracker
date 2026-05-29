import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { NotificationsController } from './notifications.controller';

const router = Router();

router.get('/', authenticate, NotificationsController.list);
router.get('/unread-count', authenticate, NotificationsController.unreadCount);
router.patch('/:id/read', authenticate, NotificationsController.markRead);
router.patch('/:id/dismiss', authenticate, NotificationsController.dismiss);

export default router;
