const { query, getClient } = require('../../config/db');
const { generateNumber } = require('../../shared/generateNumber');
const QRCode = require('qrcode');

// Create a prescription with medicines
const createPrescription = async (hospitalId, data, createdBy) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const prescriptionNumber = generateNumber('RX');

    // Generate QR code containing prescription number for verification
    const qrCode = await QRCode.toDataURL(prescriptionNumber);

    const prescResult = await client.query(
      `INSERT INTO public.prescriptions
        (hospital_id, prescription_number, appointment_id, patient_id,
         doctor_id, diagnosis, subjective_findings, objective_findings,
         assessment, advice, followup_date, qr_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [parseInt(hospitalId), prescriptionNumber,
       parseInt(data.appointment_id), parseInt(data.patient_id),
       parseInt(data.doctor_id), data.diagnosis,
       data.subjective_findings || null, data.objective_findings || null,
       data.assessment || null, data.advice || null,
       data.followup_date || null, qrCode]
    );

    const prescription = prescResult.rows[0];

    // Add medicines to prescription
    for (const med of data.medicines) {
      await client.query(
        `INSERT INTO public.prescription_medicines
          (prescription_id, medicine_id, medicine_batch_id, dosage,
           frequency, duration, route, instructions, quantity_prescribed)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [prescription.id, parseInt(med.medicine_id),
         med.medicine_batch_id ? parseInt(med.medicine_batch_id) : null,
         med.dosage, med.frequency, med.duration,
         med.route || 'ORAL', med.instructions || null,
         med.quantity_prescribed]
      );
    }

    // Mark appointment as COMPLETED
    await client.query(
      `UPDATE public.appointments SET status = 'COMPLETED', 
       completed_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [parseInt(data.appointment_id)]
    );

    await client.query('COMMIT');
    return { ...prescription, medicines: data.medicines };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Get prescription by ID with all medicines
const getPrescriptionById = async (id, hospitalId) => {
  const result = await query(
    `SELECT p.*,
            pu.first_name as patient_first_name, pu.last_name as patient_last_name,
            du.first_name as doctor_first_name, du.last_name as doctor_last_name,
            d.specialization, d.registration_number as doctor_reg_number,
            h.name as hospital_name, h.address_line1 as hospital_address
     FROM public.prescriptions p
     JOIN public.patients pat ON p.patient_id = pat.id
     JOIN public.users pu ON pat.user_id = pu.id
     JOIN public.doctors d ON p.doctor_id = d.id
     JOIN public.users du ON d.user_id = du.id
     JOIN public.hospitals h ON p.hospital_id = h.id
     WHERE p.id = $1 AND p.hospital_id = $2`,
    [parseInt(id), parseInt(hospitalId)]
  );

  if (result.rows.length === 0) {
    const err = new Error('Prescription not found');
    err.statusCode = 404;
    throw err;
  }

  // Get medicines for this prescription
  const medicines = await query(
    `SELECT pm.*, m.brand_name, m.generic_name, m.strength, m.form
     FROM public.prescription_medicines pm
     JOIN public.medicines m ON pm.medicine_id = m.id
     WHERE pm.prescription_id = $1`,
    [parseInt(id)]
  );

  return { ...result.rows[0], medicines: medicines.rows };
};

// Get all prescriptions for a patient
const getPatientPrescriptions = async (patientId, hospitalId) => {
  const result = await query(
    `SELECT p.id, p.prescription_number, p.diagnosis,
            p.followup_date, p.created_at,
            du.first_name as doctor_first_name, du.last_name as doctor_last_name,
            d.specialization
     FROM public.prescriptions p
     JOIN public.doctors d ON p.doctor_id = d.id
     JOIN public.users du ON d.user_id = du.id
     WHERE p.patient_id = $1 AND p.hospital_id = $2
     ORDER BY p.created_at DESC`,
    [parseInt(patientId), parseInt(hospitalId)]
  );
  return result.rows;
};

// Verify prescription by QR code number
const verifyPrescription = async (prescriptionNumber) => {
  const result = await query(
    `SELECT p.prescription_number, p.diagnosis, p.created_at,
            pu.first_name as patient_first_name, pu.last_name as patient_last_name,
            du.first_name as doctor_first_name, du.last_name as doctor_last_name,
            h.name as hospital_name
     FROM public.prescriptions p
     JOIN public.patients pat ON p.patient_id = pat.id
     JOIN public.users pu ON pat.user_id = pu.id
     JOIN public.doctors d ON p.doctor_id = d.id
     JOIN public.users du ON d.user_id = du.id
     JOIN public.hospitals h ON p.hospital_id = h.id
     WHERE p.prescription_number = $1`,
    [prescriptionNumber]
  );

  if (result.rows.length === 0) {
    const err = new Error('Prescription not found or invalid');
    err.statusCode = 404;
    throw err;
  }

  return result.rows[0];
};

module.exports = {
  createPrescription, getPrescriptionById,
  getPatientPrescriptions, verifyPrescription
};