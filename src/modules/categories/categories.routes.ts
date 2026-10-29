import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth.js';
import { requireHead } from '../../middleware/require-head.js';
import { validate } from '../../middleware/validate.js';
import { idParamSchema } from '../../shared/common.schemas.js';
import * as categoriesController from './categories.controller.js';
import { createCategorySchema, listCategoriesQuerySchema, updateCategorySchema } from './categories.schemas.js';

export const categoriesRouter = Router();

categoriesRouter.use(requireAuth);
categoriesRouter.get('/', validate({ query: listCategoriesQuerySchema }), categoriesController.list);
categoriesRouter.post('/', requireHead, validate({ body: createCategorySchema }), categoriesController.create);
categoriesRouter.patch(
  '/:id',
  requireHead,
  validate({ params: idParamSchema, body: updateCategorySchema }),
  categoriesController.update,
);
