// Generate unique reference numbers like APT-2025-03-042891
const generateNumber = (prefix) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 999999)).padStart(6, '0');
  return `${prefix}-${year}-${month}-${random}`;
};

module.exports = { generateNumber };