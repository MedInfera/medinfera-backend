const bcrypt = require('bcryptjs');
const { query, getClient } = require('../../config/db');
const { generateNumber } = require('../../shared/generateNumber');
const { getIO } = require('../../config/socket');

// Emit real-time trip update
const emitTripUpdate = (hospitalId, data) => {
  try {
    const io = getIO();
    io.to(`hospital:${hospitalId}`).emit('trip:update', data);
  } catch (err) {
    console.log('Socket not available:', err.message);
  }
};

// Get all ambulances
const getAllAmbulances = async (hospitalId) => {
  const result = await query(
    `SELECT a.*, 
            ad.id as current_driver_id,
            u.first_name as driver_first_name, u.last_name as driver_last_name
     FROM public.ambulances a
     LEFT JOIN public.ambulance_drivers ad ON a.id = (
       SELECT ambulance_id FROM public.ambulance_trips
       WHERE ambulance_id = a.id AND status = 'DISPATCHED'
       LIMIT 1
     )
     LEFT JOIN public.users u ON ad.user_id = u.id
     WHERE a.hospital_id = $1
     ORDER BY a.vehicle_number`,
    [parseInt(hospitalId)]
  );
  return result.rows;
};

// Create ambulance
const createAmbulance = async (hospitalId, data) => {
  const result = await query(
    `INSERT INTO public.ambulances
      (hospital_id, vehicle_number, type, has_ventilator, has_defibrillator,
       has_oxygen, make_model, year_of_manufacture, insurance_expiry,
       permit_expiry, base_charge, per_km_charge, waiting_charge_per_hour)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [parseInt(hospitalId), data.vehicle_number, data.type,
     data.has_ventilator || false, data.has_defibrillator || false,
     data.has_oxygen || false, data.make_model || null,
     data.year_of_manufacture || null,
     data.insurance_expiry || null, data.permit_expiry || null,
     data.base_charge, data.per_km_charge, data.waiting_charge_per_hour || 0]
  );
  return result.rows[0];
};

// Create driver
const createDriver = async (hospitalId, data, createdBy) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const password_hash = await bcrypt.hash(data.password, 12);
    const userResult = await client.query(
      `INSERT INTO public.users
        (hospital_id, role_id, first_name, last_name, email, password_hash, phone, created_by)
       VALUES ($1, 6, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [parseInt(hospitalId), data.first_name, data.last_name,
       data.email, password_hash, data.phone, parseInt(createdBy)]
    );

    const driverResult = await client.query(
      `INSERT INTO public.ambulance_drivers
        (hospital_id, user_id, license_number, license_expiry, experience_years)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [parseInt(hospitalId), userResult.rows[0].id,
       data.license_number, data.license_expiry, data.experience_years || 0]
    );

    await client.query('COMMIT');
    return { ...driverResult.rows[0], first_name: data.first_name, last_name: data.last_name };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Get all drivers
const getAllDrivers = async (hospitalId) => {
  const result = await query(
    `SELECT ad.*, u.first_name, u.last_name, u.email, u.phone
     FROM public.ambulance_drivers ad
     JOIN public.users u ON ad.user_id = u.id
     WHERE ad.hospital_id = $1 AND ad.is_active = true
     ORDER BY u.first_name`,
    [parseInt(hospitalId)]
  );
  return result.rows;
};

// Create trip (dispatch ambulance)
const createTrip = async (hospitalId, data, createdBy) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Check ambulance is available
    const ambResult = await client.query(
      `SELECT * FROM public.ambulances WHERE id = $1 AND hospital_id = $2`,
      [parseInt(data.ambulance_id), parseInt(hospitalId)]
    );

    if (ambResult.rows.length === 0) {
      const err = new Error('Ambulance not found');
      err.statusCode = 404;
      throw err;
    }

    if (ambResult.rows[0].status !== 'AVAILABLE') {
      const err = new Error(`Ambulance is currently ${ambResult.rows[0].status}`);
      err.statusCode = 409;
      throw err;
    }

    const ambulance = ambResult.rows[0];
    const tripNumber = generateNumber('TRIP');

    const tripResult = await client.query(
      `INSERT INTO public.ambulance_trips
        (hospital_id, trip_number, ambulance_id, driver_id, patient_id,
         request_type, request_datetime, requested_by, pickup_location,
         pickup_latitude, pickup_longitude, destination_location,
         destination_latitude, destination_longitude, status,
         base_charge, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7,$8,$9,$10,$11,$12,$13,'DISPATCHED',$14,$15)
       RETURNING *`,
      [parseInt(hospitalId), tripNumber, parseInt(data.ambulance_id),
       parseInt(data.driver_id), data.patient_id ? parseInt(data.patient_id) : null,
       data.request_type, data.requested_by || null,
       data.pickup_location, data.pickup_latitude || null, data.pickup_longitude || null,
       data.destination_location, data.destination_latitude || null,
       data.destination_longitude || null, ambulance.base_charge, parseInt(createdBy)]
    );

    // Mark ambulance as ON_TRIP
    await client.query(
      `UPDATE public.ambulances SET status = 'ON_TRIP', updated_at = NOW() WHERE id = $1`,
      [parseInt(data.ambulance_id)]
    );

    await client.query('COMMIT');

    emitTripUpdate(hospitalId, {
      action: 'DISPATCHED',
      trip_id: tripResult.rows[0].id,
      ambulance_id: data.ambulance_id,
      status: 'DISPATCHED',
    });

    return tripResult.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Update trip status
const updateTripStatus = async (tripId, hospitalId, data) => {
  const tripResult = await query(
    `SELECT * FROM public.ambulance_trips WHERE id = $1 AND hospital_id = $2`,
    [parseInt(tripId), parseInt(hospitalId)]
  );

  if (tripResult.rows.length === 0) {
    const err = new Error('Trip not found');
    err.statusCode = 404;
    throw err;
  }

  const trip = tripResult.rows[0];

  // Calculate charges on completion
  let distanceCharge = 0;
  let waitingCharge = 0;

  if (data.status === 'COMPLETED') {
    const ambResult = await query(
      `SELECT per_km_charge, waiting_charge_per_hour FROM public.ambulances WHERE id = $1`,
      [trip.ambulance_id]
    );

    if (ambResult.rows.length > 0) {
      const amb = ambResult.rows[0];
      distanceCharge = (data.distance_km || 0) * parseFloat(amb.per_km_charge);
      waitingCharge = ((data.waiting_minutes || 0) / 60) * parseFloat(amb.waiting_charge_per_hour);
    }

    // Mark ambulance as AVAILABLE again
    await query(
      `UPDATE public.ambulances SET status = 'AVAILABLE', updated_at = NOW() WHERE id = $1`,
      [trip.ambulance_id]
    );
  }

  const result = await query(
    `UPDATE public.ambulance_trips SET
       status = $1,
       distance_km = COALESCE($2, distance_km),
       waiting_minutes = COALESCE($3, waiting_minutes),
       distance_charge = $4,
       waiting_charge = $5,
       destination_datetime = CASE WHEN $1 = 'COMPLETED' THEN NOW() ELSE destination_datetime END,
       pickup_datetime = CASE WHEN $1 = 'PICKED_UP' THEN NOW() ELSE pickup_datetime END,
       notes = COALESCE($6, notes),
       updated_at = NOW()
     WHERE id = $7 AND hospital_id = $8
     RETURNING *`,
    [data.status, data.distance_km || null, data.waiting_minutes || null,
     distanceCharge, waitingCharge, data.notes || null,
     parseInt(tripId), parseInt(hospitalId)]
  );

  emitTripUpdate(hospitalId, {
    action: data.status,
    trip_id: tripId,
    ambulance_id: trip.ambulance_id,
    status: data.status,
  });

  return result.rows[0];
};

// Get active trips
const getActiveTrips = async (hospitalId) => {
  const result = await query(
    `SELECT at2.*, 
            a.vehicle_number, a.type as ambulance_type,
            u.first_name as driver_first_name, u.last_name as driver_last_name,
            u.phone as driver_phone
     FROM public.ambulance_trips at2
     JOIN public.ambulances a ON at2.ambulance_id = a.id
     JOIN public.ambulance_drivers ad ON at2.driver_id = ad.id
     JOIN public.users u ON ad.user_id = u.id
     WHERE at2.hospital_id = $1 
       AND at2.status NOT IN ('COMPLETED', 'CANCELLED')
     ORDER BY at2.request_datetime DESC`,
    [parseInt(hospitalId)]
  );
  return result.rows;
};

module.exports = {
  getAllAmbulances, createAmbulance, createDriver,
  getAllDrivers, createTrip, updateTripStatus, getActiveTrips
};