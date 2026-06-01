'use strict';
/**
 * Express allows path constraints like :id(\\d+). OpenAPI path params are
 * named segments only ({id}). Strip the constraint when converting to Swagger.
 */
const EXPRESS_PARAM_REGEX_SUFFIX = /\([^)]*\)$/;
export function normalizePath(path?: string) {
  if (!path) {
    return path;
  }
  const parts = path.split('/').map((part) => {
    if (!part.startsWith(':')) {
      return part;
    }
    const paramName = part.slice(1).replace(EXPRESS_PARAM_REGEX_SUFFIX, '');
    return `{${paramName}}`;
  });
  return parts.join('/');
}