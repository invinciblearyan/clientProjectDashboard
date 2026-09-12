import { Router } from 'express';
import { clientController } from '../controllers/client.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { paginationQuerySchema, idParamSchema } from '../validators/common.validator';
import { createClientBodySchema, updateClientBodySchema } from '../validators/client.validator';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize('ADMIN', 'PROJECT_MANAGER'),
  validate(paginationQuerySchema, 'query'),
  clientController.list,
);
router.get(
  '/:id',
  authorize('ADMIN', 'PROJECT_MANAGER'),
  validate(idParamSchema, 'params'),
  clientController.getById,
);
router.post(
  '/',
  authorize('ADMIN'),
  validate(createClientBodySchema),
  clientController.create,
);
router.patch(
  '/:id',
  authorize('ADMIN'),
  validate(idParamSchema, 'params'),
  validate(updateClientBodySchema),
  clientController.update,
);
router.delete(
  '/:id',
  authorize('ADMIN'),
  validate(idParamSchema, 'params'),
  clientController.delete,
);

export default router;
