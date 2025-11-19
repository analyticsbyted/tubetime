/**
 * Date preset utilities for quick date range selection
 */

/**
 * Gets date range for preset options
 * @param {string} preset - Preset name ('last1day', 'last7days', 'last30days', 'lastYear', 'thisMonth')
 * @returns {{startDate: string, endDate: string}} Date range in YYYY-MM-DD format
 */
export const getDatePreset = (preset) => {
  const today = new Date();
  const endDate = formatDateForInput(today);
  
  let startDate;
  
  switch (preset) {
    case 'last1day':
      startDate = formatDateForInput(new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000));
      break;
    case 'last7days':
      startDate = formatDateForInput(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000));
      break;
    case 'last30days':
      startDate = formatDateForInput(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000));
      break;
    case 'lastYear':
      startDate = formatDateForInput(new Date(today.getFullYear() - 1, today.getMonth(), today.getDate()));
      break;
    case 'thisMonth':
      startDate = formatDateForInput(new Date(today.getFullYear(), today.getMonth(), 1));
      break;
    default:
      return { startDate: '', endDate: '' };
  }
  
  return { startDate, endDate };
};

/**
 * Formats date for HTML date input (YYYY-MM-DD)
 * @param {Date} date
 * @returns {string}
 */
const formatDateForInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const DATE_PRESETS = [
  { value: 'last1day', label: 'Last 24 Hours' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastYear', label: 'Last Year' },
];

