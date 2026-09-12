import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { paginationQuerySchema, idParamSchema } from '../validators/common.validator';
import { createUserBodySchema, updateUserBodySchema } from '../validators/user.validator';

const router = Router();

router.use(authenticate);

router.get(
  '/developers',
  authorize('ADMIN', 'PROJECT_MANAGER'),
  validate(paginationQuerySchema, 'query'),
  userController.listDevelopers,
);

router.use(authorize('ADMIN'));

router.get('/', validate(paginationQuerySchema, 'query'), userController.list);
router.post('/', validate(createUserBodySchema), userController.create);
router.get('/:id', validate(idParamSchema, 'params'), userController.getById);
router.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateUserBodySchema),
  userController.update,
);
router.delete('/:id', validate(idParamSchema, 'params'), userController.deactivate);

export default router;
