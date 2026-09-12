import { Router } from 'express';
import { taskController } from '../controllers/task.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { idParamSchema } from '../validators/common.validator';
import {
  listTasksQuerySchema,
  createTaskBodySchema,
  updateTaskBodySchema,
} from '../validators/task.validator';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'PROJECT_MANAGER', 'DEVELOPER'));

router.get('/', validate(listTasksQuerySchema, 'query'), taskController.list);
router.post(
  '/',
  authorize('ADMIN', 'PROJECT_MANAGER'),
  validate(createTaskBodySchema),
  taskController.create,
);
router.get('/:id', validate(idParamSchema, 'params'), taskController.getById);

router.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateTaskBodySchema),
  taskController.update,
);

router.delete(
  '/:id',
  authorize('ADMIN', 'PROJECT_MANAGER'),
  validate(idParamSchema, 'params'),
  taskController.delete,
);

export default router;
