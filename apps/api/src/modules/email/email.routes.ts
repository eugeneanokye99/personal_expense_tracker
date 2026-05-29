import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { EmailController } from './email.controller';

const router = Router();

router.get('/accounts', authenticate, EmailController.listAccounts);
router.delete('/accounts/:id', authenticate, EmailController.disconnectAccount);
router.post('/scan', authenticate, EmailController.triggerScan);
router.get('/pending', authenticate, EmailController.listPending);
router.post('/pending/:id/confirm', authenticate, EmailController.confirm);
router.post('/pending/:id/reject', authenticate, EmailController.reject);

export default router;
