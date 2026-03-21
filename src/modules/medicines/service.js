const { query } = require('../../config/db');
const { getPagination } = require('../../shared/paginate');

// Search medicines — used in prescription builder
const searchMedicines = async (hospitalId, searchTerm) => {
  const result = await query(
    `SELECT id, brand_name, generic_name, strength, form, schedule, is_active
     FROM public.medicines
     WHERE hospital_id = $1 AND is_active = true
       AND (brand_name ILIKE $2 OR generic_name ILIKE $2)
     ORDER BY brand_name ASC
     LIMIT 20`,
    [parseInt(hospitalId), `%${searchTerm}%`]
  );
  return result.rows;
};

// Get all medicines with pagination
const getAllMedicines = async (hospitalId, queryParams) => {
  const { page, limit, offset } = getPagination(queryParams);
  const search = queryParams.search || '';
  const form = queryParams.form || '';

  const result = await query(
    `SELECT m.*, 
            COALESCE(SUM(mb.quantity_available), 0) as total_stock
     FROM public.medicines m
     LEFT JOIN public.medicine_batches mb ON m.id = mb.medicine_id 
       AND mb.status = 'ACTIVE' AND mb.is_active = true
     WHERE m.hospital_id = $1
       AND (m.brand_name ILIKE $2 OR m.generic_name ILIKE $2)
       AND ($3 = '' OR m.form = $3)
     GROUP BY m.id
     ORDER BY m.brand_name ASC
     LIMIT $4 OFFSET $5`,
    [parseInt(hospitalId), `%${search}%`, form, limit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) FROM public.medicines
     WHERE hospital_id = $1 AND (brand_name ILIKE $2 OR generic_name ILIKE $2)`,
    [parseInt(hospitalId), `%${search}%`]
  );

  return {
    medicines: result.rows,
    total: parseInt(countResult.rows[0].count),
    page, limit
  };
};

// Get single medicine with batch info
const getMedicineById = async (id, hospitalId) => {
  const result = await query(
    `SELECT * FROM public.medicines
     WHERE id = $1 AND hospital_id = $2`,
    [parseInt(id), parseInt(hospitalId)]
  );
  if (result.rows.length === 0) {
    const err = new Error('Medicine not found');
    err.statusCode = 404;
    throw err;
  }

  // Get active batches
  const batches = await query(
    `SELECT * FROM public.medicine_batches
     WHERE medicine_id = $1 AND hospital_id = $2 
       AND is_active = true AND status != 'EXPIRED'
     ORDER BY expiry_date ASC`,
    [parseInt(id), parseInt(hospitalId)]
  );

  return { ...result.rows[0], batches: batches.rows };
};

// Create medicine
const createMedicine = async (hospitalId, data, createdBy) => {
  const result = await query(
    `INSERT INTO public.medicines
      (hospital_id, brand_name, generic_name, strength, form, category,
       schedule, manufacturer, contraindications, side_effects,
       drug_interactions, pregnancy_category, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [parseInt(hospitalId), data.brand_name, data.generic_name,
     data.strength, data.form, data.category || null,
     data.schedule || 'GENERAL', data.manufacturer || null,
     JSON.stringify(data.contraindications || []),
     JSON.stringify(data.side_effects || []),
     JSON.stringify(data.drug_interactions || []),
     data.pregnancy_category || null, parseInt(createdBy)]
  );
  return result.rows[0];
};

// Add stock batch
const addBatch = async (hospitalId, data, createdBy) => {
  const result = await query(
    `INSERT INTO public.medicine_batches
      (hospital_id, medicine_id, supplier_id, batch_number,
       manufacturing_date, expiry_date, quantity_total, quantity_available,
       purchase_price_per_unit, selling_price_per_unit, mrp,
       storage_location, rack_number, received_date, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [parseInt(hospitalId), parseInt(data.medicine_id),
     data.supplier_id ? parseInt(data.supplier_id) : null,
     data.batch_number, data.manufacturing_date, data.expiry_date,
     data.quantity_total, data.purchase_price_per_unit,
     data.selling_price_per_unit, data.mrp,
     data.storage_location || null, data.rack_number || null,
     data.received_date, parseInt(createdBy)]
  );
  return result.rows[0];
};

// Get low stock medicines (quantity below 10)
const getLowStock = async (hospitalId) => {
  const result = await query(
    `SELECT m.id, m.brand_name, m.generic_name, m.strength, m.form,
            COALESCE(SUM(mb.quantity_available), 0) as total_stock
     FROM public.medicines m
     LEFT JOIN public.medicine_batches mb ON m.id = mb.medicine_id
       AND mb.status = 'ACTIVE' AND mb.is_active = true
     WHERE m.hospital_id = $1 AND m.is_active = true
     GROUP BY m.id
     HAVING COALESCE(SUM(mb.quantity_available), 0) < 10
     ORDER BY total_stock ASC`,
    [parseInt(hospitalId)]
  );
  return result.rows;
};

// Get expiring soon (within 90 days)
const getExpiringSoon = async (hospitalId) => {
  const result = await query(
    `SELECT mb.*, m.brand_name, m.generic_name, m.strength, m.form
     FROM public.medicine_batches mb
     JOIN public.medicines m ON mb.medicine_id = m.id
     WHERE mb.hospital_id = $1 AND mb.status = 'ACTIVE'
       AND mb.expiry_date <= NOW() + INTERVAL '90 days'
       AND mb.expiry_date > NOW()
     ORDER BY mb.expiry_date ASC`,
    [parseInt(hospitalId)]
  );
  return result.rows;
};

module.exports = {
  searchMedicines, getAllMedicines, getMedicineById,
  createMedicine, addBatch, getLowStock, getExpiringSoon
};