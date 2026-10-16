export const normalizeLimit = (limit, fallback = 50, max = 200) => {
  const parsedLimit = Number(limit);

  if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
    return fallback;
  }

  return Math.min(parsedLimit, max);
};

export default normalizeLimit;
