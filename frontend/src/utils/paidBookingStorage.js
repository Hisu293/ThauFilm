const STORAGE_KEY = 'tf_paid_booking_summaries';
const UNAVAILABLE_DISCOUNTS_KEY = 'tf_unavailable_discount_codes';
const BOOKING_REPLACEMENTS_KEY = 'tf_booking_replacements';
const MAX_SAVED_BOOKINGS = 100;

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readStore = () => {
  if (!canUseStorage()) return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const writeStore = (store) => {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Payment already succeeded; storage failure must not break the success flow.
  }
};

const toAmount = (value, fallback = 0) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : fallback;
};

export const savePaidBookingSummary = (bookingId, summary = {}) => {
  if (!bookingId) return;

  const originalAmount = toAmount(summary.originalAmount);
  const discountAmount = Math.min(toAmount(summary.discountAmount), originalAmount);
  const finalAmount = toAmount(summary.finalAmount, Math.max(originalAmount - discountAmount, 0));
  const store = readStore();

  store[String(bookingId)] = {
    originalAmount,
    discountAmount,
    finalAmount,
    discountCode: summary.discountCode || '',
    paymentMethod: summary.paymentMethod || '',
    updatedAt: new Date().toISOString(),
  };

  const entries = Object.entries(store)
    .sort(([, a], [, b]) => String(b?.updatedAt || '').localeCompare(String(a?.updatedAt || '')))
    .slice(0, MAX_SAVED_BOOKINGS);

  writeStore(Object.fromEntries(entries));
};

export const getPaidBookingSummary = (bookingId) => {
  if (!bookingId) return null;
  return readStore()[String(bookingId)] || null;
};

export const getSavedDiscountCodes = () =>
  new Set(
    [
      ...Object.values(readStore()).map((summary) => summary?.discountCode),
      ...Object.keys(readUnavailableDiscounts()),
    ]
      .map((code) => String(code || '').trim().toUpperCase())
      .filter(Boolean),
  );

const readUnavailableDiscounts = () => {
  if (!canUseStorage()) return {};

  try {
    const raw = window.localStorage.getItem(UNAVAILABLE_DISCOUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const markDiscountCodeUnavailable = (code, reason = '') => {
  const normalizedCode = String(code || '').trim().toUpperCase();
  if (!normalizedCode || !canUseStorage()) return;

  const unavailableDiscounts = readUnavailableDiscounts();
  unavailableDiscounts[normalizedCode] = {
    reason,
    updatedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(UNAVAILABLE_DISCOUNTS_KEY, JSON.stringify(unavailableDiscounts));
  } catch {
    // The current page still removes the rejected code even if persistence fails.
  }
};

export const saveBookingReplacement = (oldBookingId, newBookingId) => {
  if (!oldBookingId || !newBookingId || !canUseStorage()) return;

  try {
    const raw = window.localStorage.getItem(BOOKING_REPLACEMENTS_KEY);
    const replacements = raw ? JSON.parse(raw) : {};
    replacements[String(oldBookingId)] = String(newBookingId);
    window.localStorage.setItem(BOOKING_REPLACEMENTS_KEY, JSON.stringify(replacements));
  } catch {
    // Booking replacement still succeeds even when this display-only cache fails.
  }
};

export const getSupersededBookingIds = () => {
  if (!canUseStorage()) return new Set();

  try {
    const raw = window.localStorage.getItem(BOOKING_REPLACEMENTS_KEY);
    return new Set(Object.keys(raw ? JSON.parse(raw) : {}));
  } catch {
    return new Set();
  }
};
