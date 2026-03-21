const { query, getClient } = require('../../config/db');
const { getIO } = require('../../config/socket');

// Emit real-time bed status update to hospital room
const emitBedUpdate = (hospitalId, data) => {
  try {
    const io = getIO();
    io.to(`hospital:${hospitalId}`).emit('bed:update', data);
  } catch (err) {
    console.log('Socket not available:', err.message);
  }
};

// ── Buildings ──
const createBuilding = async (hospitalId, data) => {
  const result = await query(
    `INSERT INTO public.buildings (hospital_id, name, code, total_floors)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [parseInt(hospitalId), data.name, data.code || null, data.total_floors || null]
  );
  return result.rows[0];
};

const getBuildings = async (hospitalId) => {
  const result = await query(
    `SELECT b.*, 
            COUNT(DISTINCT f.id) as floor_count,
            COUNT(DISTINCT w.id) as ward_count,
            COUNT(DISTINCT bd.id) as total_beds,
            COUNT(DISTINCT bd.id) FILTER (WHERE bd.status = 'AVAILABLE') as available_beds
     FROM public.buildings b
     LEFT JOIN public.floors f ON b.id = f.building_id
     LEFT JOIN public.wards w ON f.id = w.floor_id
     LEFT JOIN public.beds bd ON w.id = bd.ward_id
     WHERE b.hospital_id = $1
     GROUP BY b.id
     ORDER BY b.name`,
    [parseInt(hospitalId)]
  );
  return result.rows;
};

// ── Floors ──
const createFloor = async (data) => {
  const result = await query(
    `INSERT INTO public.floors (building_id, floor_number, name)
     VALUES ($1, $2, $3) RETURNING *`,
    [parseInt(data.building_id), data.floor_number, data.name || null]
  );
  return result.rows[0];
};

// ── Wards ──
const createWard = async (data) => {
  const result = await query(
    `INSERT INTO public.wards (floor_id, name, ward_type, total_beds)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [parseInt(data.floor_id), data.name, data.ward_type, data.total_beds]
  );
  return result.rows[0];
};

// ── Beds ──
const createBed = async (data) => {
  const result = await query(
    `INSERT INTO public.beds
      (ward_id, bed_number, bed_type, has_oxygen, has_suction,
       has_monitor, has_ventilator, daily_charge)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [parseInt(data.ward_id), data.bed_number, data.bed_type,
     data.has_oxygen || false, data.has_suction || false,
     data.has_monitor || false, data.has_ventilator || false,
     data.daily_charge || 0]
  );
  return result.rows[0];
};

// Get bed availability dashboard
const getBedDashboard = async (hospitalId) => {
  const result = await query(
    `SELECT 
       w.id as ward_id, w.name as ward_name, w.ward_type,
       COUNT(b.id) as total_beds,
       COUNT(b.id) FILTER (WHERE b.status = 'AVAILABLE') as available,
       COUNT(b.id) FILTER (WHERE b.status = 'OCCUPIED') as occupied,
       COUNT(b.id) FILTER (WHERE b.status = 'CLEANING') as cleaning,
       COUNT(b.id) FILTER (WHERE b.status = 'MAINTENANCE') as maintenance
     FROM public.wards w
     JOIN public.floors f ON w.floor_id = f.id
     JOIN public.buildings bg ON f.building_id = bg.id
     LEFT JOIN public.beds b ON w.id = b.ward_id
     WHERE bg.hospital_id = $1
     GROUP BY w.id, w.name, w.ward_type
     ORDER BY w.ward_type, w.name`,
    [parseInt(hospitalId)]
  );

  // Overall summary
  const summary = await query(
    `SELECT 
       COUNT(b.id) as total_beds,
       COUNT(b.id) FILTER (WHERE b.status = 'AVAILABLE') as available,
       COUNT(b.id) FILTER (WHERE b.status = 'OCCUPIED') as occupied,
       COUNT(b.id) FILTER (WHERE b.status = 'CLEANING') as cleaning,
       COUNT(b.id) FILTER (WHERE b.status = 'MAINTENANCE') as maintenance,
       COUNT(b.id) FILTER (WHERE b.bed_type = 'ICU') as icu_total,
       COUNT(b.id) FILTER (WHERE b.bed_type = 'ICU' AND b.status = 'AVAILABLE') as icu_available
     FROM public.beds b
     JOIN public.wards w ON b.ward_id = w.id
     JOIN public.floors f ON w.floor_id = f.id
     JOIN public.buildings bg ON f.building_id = bg.id
     WHERE bg.hospital_id = $1`,
    [parseInt(hospitalId)]
  );

  return { summary: summary.rows[0], wards: result.rows };
};

// Get available beds in a ward
const getAvailableBeds = async (hospitalId, wardId) => {
  const result = await query(
    `SELECT b.* FROM public.beds b
     JOIN public.wards w ON b.ward_id = w.id
     JOIN public.floors f ON w.floor_id = f.id
     JOIN public.buildings bg ON f.building_id = bg.id
     WHERE bg.hospital_id = $1 AND b.status = 'AVAILABLE'
       AND ($2::int IS NULL OR b.ward_id = $2)
     ORDER BY b.bed_number`,
    [parseInt(hospitalId), wardId ? parseInt(wardId) : null]
  );
  return result.rows;
};

// Admit patient to a bed
const admitPatient = async (hospitalId, data, admittedBy) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Check bed is available
    const bedResult = await client.query(
      `SELECT b.* FROM public.beds b
       JOIN public.wards w ON b.ward_id = w.id
       JOIN public.floors f ON w.floor_id = f.id
       JOIN public.buildings bg ON f.building_id = bg.id
       WHERE b.id = $1 AND bg.hospital_id = $2`,
      [parseInt(data.bed_id), parseInt(hospitalId)]
    );

    if (bedResult.rows.length === 0) {
      const err = new Error('Bed not found');
      err.statusCode = 404;
      throw err;
    }

    if (bedResult.rows[0].status !== 'AVAILABLE') {
      const err = new Error(`Bed is currently ${bedResult.rows[0].status}`);
      err.statusCode = 409;
      throw err;
    }

    // Create bed allocation
    const allocationResult = await client.query(
      `INSERT INTO public.bed_allocations
        (hospital_id, bed_id, patient_id, admitted_by, admitting_doctor_id,
         admission_datetime, expected_discharge_datetime, primary_diagnosis,
         treatment_plan, daily_charge_applicable, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [parseInt(hospitalId), parseInt(data.bed_id), parseInt(data.patient_id),
       parseInt(admittedBy), parseInt(data.admitting_doctor_id),
       data.admission_datetime,
       data.expected_discharge_datetime || null,
       data.primary_diagnosis, data.treatment_plan || null,
       data.daily_charge_applicable, data.notes || null]
    );

    // Mark bed as OCCUPIED
    await client.query(
      `UPDATE public.beds SET status = 'OCCUPIED', updated_at = NOW() WHERE id = $1`,
      [parseInt(data.bed_id)]
    );

    await client.query('COMMIT');

    // Emit real-time update
    emitBedUpdate(hospitalId, {
      action: 'ADMITTED',
      bed_id: data.bed_id,
      status: 'OCCUPIED',
    });

    return allocationResult.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Discharge patient
const dischargePatient = async (allocationId, hospitalId, dischargedBy) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Get allocation
    const allocationResult = await client.query(
      `SELECT * FROM public.bed_allocations WHERE id = $1 AND hospital_id = $2`,
      [parseInt(allocationId), parseInt(hospitalId)]
    );

    if (allocationResult.rows.length === 0) {
      const err = new Error('Allocation not found');
      err.statusCode = 404;
      throw err;
    }

    const allocation = allocationResult.rows[0];

    // Calculate total charges
    const admissionDate = new Date(allocation.admission_datetime);
    const dischargeDate = new Date();
    const days = Math.ceil((dischargeDate - admissionDate) / (1000 * 60 * 60 * 24));
    const totalCharges = days * parseFloat(allocation.daily_charge_applicable);

    // Update allocation
    await client.query(
      `UPDATE public.bed_allocations SET
         status = 'DISCHARGED',
         actual_discharge_datetime = NOW(),
         discharged_by = $1,
         total_charges = $2,
         updated_at = NOW()
       WHERE id = $3`,
      [parseInt(dischargedBy), totalCharges, parseInt(allocationId)]
    );

    // Mark bed as CLEANING
    await client.query(
      `UPDATE public.beds SET status = 'CLEANING', updated_at = NOW() WHERE id = $1`,
      [allocation.bed_id]
    );

    await client.query('COMMIT');

    // Emit real-time update
    emitBedUpdate(hospitalId, {
      action: 'DISCHARGED',
      bed_id: allocation.bed_id,
      status: 'CLEANING',
    });

    return { message: 'Patient discharged successfully', total_charges: totalCharges };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Mark bed as available after cleaning
const markBedAvailable = async (bedId, hospitalId) => {
  const result = await query(
    `UPDATE public.beds SET status = 'AVAILABLE', 
     last_cleaned_at = NOW(), updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [parseInt(bedId)]
  );

  emitBedUpdate(hospitalId, {
    action: 'AVAILABLE',
    bed_id: bedId,
    status: 'AVAILABLE',
  });

  return result.rows[0];
};

module.exports = {
  createBuilding, getBuildings, createFloor, createWard,
  createBed, getBedDashboard, getAvailableBeds,
  admitPatient, dischargePatient, markBedAvailable
};