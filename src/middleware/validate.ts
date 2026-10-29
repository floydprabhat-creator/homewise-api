import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

type Schemas = { body?: ZodType; params?: ZodType; query?: ZodType };

/**
 * Parses the request with Zod. The parsed body replaces req.body; parsed params and query
 * go to res.locals.params / res.locals.query because Express 5 makes req.query read-only.
 * A ZodError is passed on to the error handler, which turns it into a 400 with field errors.
 */
export function validate(schemas: Schemas): RequestHandler {
  return (req, res, next) => {
    if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
    if (schemas.params) res.locals.params = schemas.params.parse(req.params);
    if (schemas.query) res.locals.query = schemas.query.parse(req.query);
    next();
  };
}
