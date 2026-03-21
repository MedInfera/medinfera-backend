const Razorpay = require('razorpay');
const crypto = require('crypto');
const { query } = require('../../config/db');
const { generateNumber } = require('../../shared/generateNumber');
const env = require('../../config/env');

// Initialize Razorpay
const getRazorpay = () => {
  return new Razorpay({
    key_id: env.razorpay.keyId,
    key_secret: env.razorpay.keySecret,
  });
};

// Calculate revenue split — hospital 70%, doctor 20%, platform 10%
const calculateSplit = (amount) => {
  return {
    hospital_share: parseFloat((amount * 0.70).toFixed(2)),
    doctor_share: parseFloat((amount * 0.20).toFixed(2)),
    platform_fee: parseFloat((amount * 0.10).toFixed(2)),
  };
};

// Create Razorpay order for online payment
const createRazorpayOrder = async (hospitalId, data, createdBy) => {
  const razorpay = getRazorpay();
  const paymentNumber = generateNumber('PAY');

  // Create order in Razorpay (amount in paise)
  const order = await razorpay.orders.create({
    amount: Math.round(data.amount * 100),
    currency: 'INR',
    receipt: paymentNumber,
    notes: {
      hospital_id: hospitalId,
      patient_id: data.patient_id,
      payment_number: paymentNumber,
    },
  });

  const split = calculateSplit(data.amount);

  // Save pending payment record
  const result = await query(
    `INSERT INTO public.payments
      (hospital_id, payment_number, appointment_id, bed_allocation_id,
       ambulance_trip_id, patient_id, amount, payment_method,
       transaction_id, gateway_response, status,
       hospital_share, doctor_share, platform_fee, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'UPI',$8,$9,'PENDING',$10,$11,$12,$13,$14)
     RETURNING *`,
    [parseInt(hospitalId), paymentNumber,
     data.appointment_id ? parseInt(data.appointment_id) : null,
     data.bed_allocation_id ? parseInt(data.bed_allocation_id) : null,
     data.ambulance_trip_id ? parseInt(data.ambulance_trip_id) : null,
     parseInt(data.patient_id), data.amount,
     order.id, JSON.stringify(order),
     split.hospital_share, split.doctor_share, split.platform_fee,
     data.notes || null, parseInt(createdBy)]
  );

  return {
    payment: result.rows[0],
    razorpay_order: {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: env.razorpay.keyId,
    },
  };
};

// Verify Razorpay webhook signature and mark payment success
const verifyRazorpayPayment = async (data) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, payment_number } = data;

  // Verify signature
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', env.razorpay.keySecret)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    const err = new Error('Invalid payment signature');
    err.statusCode = 400;
    throw err;
  }

  // Update payment to SUCCESS
  const result = await query(
    `UPDATE public.payments SET
       status = 'SUCCESS',
       transaction_id = $1,
       payment_date = NOW(),
       updated_at = NOW()
     WHERE payment_number = $2
     RETURNING *`,
    [razorpay_payment_id, payment_number]
  );

  if (result.rows.length === 0) {
    const err = new Error('Payment record not found');
    err.statusCode = 404;
    throw err;
  }

  const payment = result.rows[0];

  // Update appointment payment status if linked
  if (payment.appointment_id) {
    await query(
      `UPDATE public.appointments SET payment_status = 'PAID', updated_at = NOW()
       WHERE id = $1`,
      [payment.appointment_id]
    );
  }

  return payment;
};

// Record cash payment directly
const recordCashPayment = async (hospitalId, data, createdBy) => {
  const paymentNumber = generateNumber('PAY');
  const split = calculateSplit(data.amount);

  const result = await query(
    `INSERT INTO public.payments
      (hospital_id, payment_number, appointment_id, bed_allocation_id,
       ambulance_trip_id, patient_id, amount, discount_amount,
       payment_method, status, payment_date,
       hospital_share, doctor_share, platform_fee, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'CASH','SUCCESS',NOW(),$9,$10,$11,$12,$13)
     RETURNING *`,
    [parseInt(hospitalId), paymentNumber,
     data.appointment_id ? parseInt(data.appointment_id) : null,
     data.bed_allocation_id ? parseInt(data.bed_allocation_id) : null,
     data.ambulance_trip_id ? parseInt(data.ambulance_trip_id) : null,
     parseInt(data.patient_id), data.amount,
     data.discount_amount || 0,
     split.hospital_share, split.doctor_share, split.platform_fee,
     data.notes || null, parseInt(createdBy)]
  );

  // Update appointment payment status if linked
  if (data.appointment_id) {
    await query(
      `UPDATE public.appointments SET payment_status = 'PAID', updated_at = NOW()
       WHERE id = $1`,
      [parseInt(data.appointment_id)]
    );
  }

  return result.rows[0];
};

// Get payment history for a patient
const getPatientPayments = async (patientId, hospitalId) => {
  const result = await query(
    `SELECT p.*, 
            a.appointment_number,
            u.first_name as patient_first_name, u.last_name as patient_last_name
     FROM public.payments p
     LEFT JOIN public.appointments a ON p.appointment_id = a.id
     JOIN public.patients pat ON p.patient_id = pat.id
     JOIN public.users u ON pat.user_id = u.id
     WHERE p.patient_id = $1 AND p.hospital_id = $2
     ORDER BY p.created_at DESC`,
    [parseInt(patientId), parseInt(hospitalId)]
  );
  return result.rows;
};

// Get hospital revenue report
const getRevenueReport = async (hospitalId, startDate, endDate) => {
  const result = await query(
    `SELECT 
       DATE(payment_date) as date,
       COUNT(*) as total_transactions,
       SUM(total_amount) as gross_revenue,
       SUM(hospital_share) as hospital_revenue,
       SUM(doctor_share) as doctor_revenue,
       SUM(platform_fee) as platform_revenue,
       SUM(CASE WHEN payment_method = 'CASH' THEN total_amount ELSE 0 END) as cash_revenue,
       SUM(CASE WHEN payment_method != 'CASH' THEN total_amount ELSE 0 END) as online_revenue
     FROM public.payments
     WHERE hospital_id = $1 AND status = 'SUCCESS'
       AND payment_date BETWEEN $2 AND $3
     GROUP BY DATE(payment_date)
     ORDER BY date DESC`,
    [parseInt(hospitalId), startDate, endDate]
  );

  const summary = await query(
    `SELECT 
       COUNT(*) as total_transactions,
       SUM(total_amount) as total_revenue,
       SUM(hospital_share) as hospital_share,
       SUM(doctor_share) as doctor_share,
       SUM(platform_fee) as platform_fee
     FROM public.payments
     WHERE hospital_id = $1 AND status = 'SUCCESS'
       AND payment_date BETWEEN $2 AND $3`,
    [parseInt(hospitalId), startDate, endDate]
  );

  return { summary: summary.rows[0], daily: result.rows };
};

// Get doctor payout summary
const getDoctorPayoutSummary = async (hospitalId, doctorId, startDate, endDate) => {
  const result = await query(
    `SELECT 
       COUNT(a.id) as consultation_count,
       SUM(p.doctor_share) as total_earnings,
       SUM(p.doctor_share) FILTER (WHERE dp.id IS NULL) as pending_payout
     FROM public.payments p
     JOIN public.appointments a ON p.appointment_id = a.id
     LEFT JOIN public.doctor_payouts dp ON dp.doctor_id = $2
       AND p.payment_date BETWEEN dp.period_start AND dp.period_end
     WHERE p.hospital_id = $1 AND a.doctor_id = $2
       AND p.status = 'SUCCESS'
       AND p.payment_date BETWEEN $3 AND $4`,
    [parseInt(hospitalId), parseInt(doctorId), startDate, endDate]
  );
  return result.rows[0];
};

module.exports = {
  createRazorpayOrder, verifyRazorpayPayment,
  recordCashPayment, getPatientPayments,
  getRevenueReport, getDoctorPayoutSummary
};