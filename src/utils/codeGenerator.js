const prisma = require('../config/database');

/**
 * Generate padded sequential codes scoped to hospital
 * e.g. PAT-00001, IPD-2024-0001
 */

const generatePatientCode = async (hospitalId) => {
  const count = await prisma.patientProfile.count({ where: { hospitalId } });
  return `PAT-${String(count + 1).padStart(5, '0')}`;
};

const generateAdmissionNumber = async (hospitalId) => {
  const year = new Date().getFullYear();
  const count = await prisma.ipdAdmission.count({
    where: {
      hospitalId,
      admissionDate: {
        gte: new Date(`${year}-01-01`),
      },
    },
  });
  return `IPD-${year}-${String(count + 1).padStart(4, '0')}`;
};

const generateInvoiceNumber = async (hospitalId, type = 'INV') => {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const count = await prisma.invoice.count({
    where: {
      hospitalId,
      createdAt: { gte: new Date(`${year}-${month}-01`) },
    },
  });
  return `${type}-${year}${month}-${String(count + 1).padStart(4, '0')}`;
};

const generateLabOrderNumber = async (hospitalId) => {
  const year = new Date().getFullYear();
  const count = await prisma.labOrder.count({
    where: {
      hospitalId,
      createdAt: { gte: new Date(`${year}-01-01`) },
    },
  });
  return `LAB-${year}-${String(count + 1).padStart(5, '0')}`;
};

const generatePurchaseOrderNumber = async (hospitalId) => {
  const year = new Date().getFullYear();
  const count = await prisma.purchaseOrder.count({
    where: {
      hospitalId,
      createdAt: { gte: new Date(`${year}-01-01`) },
    },
  });
  return `PO-${year}-${String(count + 1).padStart(4, '0')}`;
};

module.exports = {
  generatePatientCode,
  generateAdmissionNumber,
  generateInvoiceNumber,
  generateLabOrderNumber,
  generatePurchaseOrderNumber,
};
