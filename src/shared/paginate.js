// Standard pagination helper
// Usage: const { limit, offset, page } = getPagination(req.query)
const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, parseInt(query.limit) || 10);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

module.exports = { getPagination };