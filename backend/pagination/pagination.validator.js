import { normalizeCursorLimit } from './cursor.js';

const sanitizePaginationQuery = (req, res, next) => {
  const { limit, cursor } = req.query;

  const normalizedLimit = normalizeCursorLimit(limit);
  const decodedCursor = cursor ? (() => {
    try {
      return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    } catch (error) {
      return null;
    }
  })() : null;

  req.pagination = {
    limit: normalizedLimit,
    cursor: decodedCursor,
  };

  next();
};

export default sanitizePaginationQuery;
