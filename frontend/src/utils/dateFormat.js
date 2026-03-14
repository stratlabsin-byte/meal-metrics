/**
 * Format date to DD-Mon-YYYY format
 * @param {string|Date} dateInput - Date string or Date object
 * @returns {string} Formatted date string (e.g., "21-Nov-2025")
 */
export const formatDateDDMonYYYY = (dateInput) => {
  if (!dateInput) return '';
  
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  
  if (isNaN(date.getTime())) return '';
  
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day}-${month}-${year}`;
};

/**
 * Format date for display in tables and cards
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export const formatDisplayDate = (dateString) => {
  return formatDateDDMonYYYY(dateString);
};
