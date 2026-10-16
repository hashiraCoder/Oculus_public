import crypto from 'node:crypto';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export const normalizeCursorLimit = (limit) => {
  const parsedLimit = Number(limit);

  if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
    return DEFAULT_LIMIT;
  }

  return Math.min(parsedLimit, MAX_LIMIT);
};

export const encodeCursor = (cursorValue) => {
  if (!cursorValue || typeof cursorValue !== 'object') {
    return null;
  }

  return Buffer.from(JSON.stringify(cursorValue)).toString('base64url');
};

export const decodeCursor = (cursorValue) => {
  if (!cursorValue || typeof cursorValue !== 'string') {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(cursorValue, 'base64url').toString('utf8'));
  } catch (error) {
    return null;
  }
};

export const buildCursorPagination = ({ items, limit, hasMore, cursorKey = 'created_at' }) => {
  const normalizedLimit = normalizeCursorLimit(limit);
  const nextCursor = hasMore && items.length > 0
    ? encodeCursor({ [cursorKey]: items.at(-1)?.[cursorKey], id: items.at(-1)?.id })
    : null;

  return {
    items,
    limit: normalizedLimit,
    hasMore,
    nextCursor,
  };
};

export const buildCursorClause = ({ cursor, sortColumn = 'created_at', idColumn = 'id' }) => {
  if (!cursor || typeof cursor !== 'object') {
    return { whereClause: '', params: [] };
  }

  const params = [];
  const sortValue = cursor[sortColumn];
  const idValue = cursor[idColumn];

  if (sortValue !== undefined && idValue !== undefined) {
    params.push(sortValue, idValue);
    return {
      whereClause: `WHERE (${sortColumn} < $1 OR (${sortColumn} = $1 AND ${idColumn} < $2))`,
      params,
    };
  }

  if (sortValue !== undefined) {
    params.push(sortValue);
    return {
      whereClause: `WHERE ${sortColumn} < $1`,
      params,
    };
  }

  return { whereClause: '', params: [] };
};

export const applyCursorSort = (query, { sortColumn = 'created_at', sortDirection = 'DESC' }) => {
  const direction = sortDirection.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  return `${query} ORDER BY ${sortColumn} ${direction}, id ${direction}`;
};

export const buildCursorQuery = ({ baseQuery, cursor, limit, sortColumn = 'created_at', idColumn = 'id', sortDirection = 'DESC' }) => {
  const normalizedLimit = normalizeCursorLimit(limit);
  const { whereClause, params } = buildCursorClause({ cursor, sortColumn, idColumn });
  const orderedQuery = applyCursorSort(baseQuery, { sortColumn, sortDirection });
  const fullQuery = `${orderedQuery} ${whereClause} LIMIT $${params.length + 1}`;

  return {
    text: fullQuery,
    params: [...params, normalizedLimit + 1],
    limit: normalizedLimit,
  };
};

export const createCursorQuery = ({ baseQuery, cursor, limit, sortColumn = 'created_at', idColumn = 'id', sortDirection = 'DESC' }) => {
  const { text, params, limit: normalizedLimit } = buildCursorQuery({
    baseQuery,
    cursor,
    limit,
    sortColumn,
    idColumn,
    sortDirection,
  });

  return {
    text,
    params,
    limit: normalizedLimit,
  };
};

export default {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  normalizeCursorLimit,
  encodeCursor,
  decodeCursor,
  buildCursorPagination,
  buildCursorClause,
  applyCursorSort,
  buildCursorQuery,
  createCursorQuery,
};
