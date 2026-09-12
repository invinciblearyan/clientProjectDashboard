import { Router } from 'express';
import { projectController } from '../controllers/project.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { idParamSchema } from '../validators/common.validator';
import {
  listProjectsQuerySchema,
  createProjectBodySchema,
  updateProjectBodySchema,
} from '../validators/project.validator';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'PROJECT_MANAGER'));

router.get('/', validate(listProjectsQuerySchema, 'query'), projectController.list);
router.post('/', validate(createProjectBodySchema), projectController.create);
router.get('/:id', validate(idParamSchema, 'params'), projectController.getById);
router.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateProjectBodySchema),
  projectController.update,
);
router.delete('/:id', validate(idParamSchema, 'params'), projectController.delete);

export default router;
