import { Router } from 'express';
import { activityController } from '../controllers/activity.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { listActivityQuerySchema } from '../validators/activity.validator';

const router = Router();

router.use(authenticate);
router.get('/', validate(listActivityQuerySchema, 'query'), activityController.list);

export default router;
