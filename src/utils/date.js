/**
 * Date Utility
 * Helper functions for date operations
 * @module utils/date
 */

import { format, parse, isValid, addDays, addMonths, subDays, subMonths } from 'date-fns';

/**
 * Format date
 * @param {Date|string|number} date - Date
 * @param {string} formatString - Format string
 * @returns {string} Formatted date
 */
export function formatDate(date, formatString = 'yyyy-MM-dd HH:mm:ss') {
  const dateObj = date instanceof Date ? date : new Date(date);
  return format(dateObj, formatString);
}

/**
 * Parse date string
 * @param {string} dateString - Date string
 * @param {string} formatString - Format string
 * @returns {Date} Parsed date
 */
export function parseDate(dateString, formatString = 'yyyy-MM-dd') {
  return parse(dateString, formatString, new Date());
}

/**
 * Check if date is valid
 * @param {Date} date - Date
 * @returns {boolean} Is valid
 */
export function isValidDate(date) {
  return isValid(date);
}

/**
 * Get current timestamp
 * @returns {number} Timestamp
 */
export function getCurrentTimestamp() {
  return Date.now();
}

/**
 * Get current date
 * @returns {Date} Current date
 */
export function getCurrentDate() {
  return new Date();
}

/**
 * Add days to date
 * @param {Date} date - Date
 * @param {number} days - Days to add
 * @returns {Date} New date
 */
export function addDaysToDate(date, days) {
  return addDays(date, days);
}

/**
 * Add months to date
 * @param {Date} date - Date
 * @param {number} months - Months to add
 * @returns {Date} New date
 */
export function addMonthsToDate(date, months) {
  return addMonths(date, months);
}

/**
 * Subtract days from date
 * @param {Date} date - Date
 * @param {number} days - Days to subtract
 * @returns {Date} New date
 */
export function subtractDaysFromDate(date, days) {
  return subDays(date, days);
}

/**
 * Subtract months from date
 * @param {Date} date - Date
 * @param {number} months - Months to subtract
 * @returns {Date} New date
 */
export function subtractMonthsFromDate(date, months) {
  return subMonths(date, months);
}

/**
 * Get date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {object} Date range
 */
export function getDateRange(startDate, endDate) {
  return {
    start: formatDate(startDate, 'yyyy-MM-dd 00:00:00'),
    end: formatDate(endDate, 'yyyy-MM-dd 23:59:59')
  };
}

/**
 * Get time difference in milliseconds
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {number} Difference in milliseconds
 */
export function getTimeDifference(date1, date2) {
  return Math.abs(new Date(date1) - new Date(date2));
}

/**
 * Get time difference in seconds
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @returns {number} Difference in seconds
 */
export function getTimeDifferenceInSeconds(date1, date2) {
  return Math.floor(getTimeDifference(date1, date2) / 1000);
}

/**
 * Format duration
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} Formatted duration
 */
export function formatDuration(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export default {
  formatDate,
  parseDate,
  isValidDate,
  getCurrentTimestamp,
  getCurrentDate,
  addDaysToDate,
  addMonthsToDate,
  subtractDaysFromDate,
  subtractMonthsFromDate,
  getDateRange,
  getTimeDifference,
  getTimeDifferenceInSeconds,
  formatDuration
};
