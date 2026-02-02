import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param html - Raw HTML content
 * @returns Sanitized HTML string
 */
export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p'],
    ALLOWED_ATTR: ['class'],
  });
};

/**
 * Sanitize user input for display
 * @param input - Raw user input
 * @returns Sanitized string
 */
export const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
};

/**
 * Sanitize and validate user notes
 * @param notes - Raw notes content
 * @param maxLength - Maximum allowed length
 * @returns Sanitized and validated notes
 */
export const sanitizeNotes = (notes: string, maxLength = 1000): string => {
  const sanitized = DOMPurify.sanitize(notes, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
  });
  
  // Truncate if exceeds maximum length
  if (sanitized.length > maxLength) {
    return sanitized.substring(0, maxLength);
  }
  
  return sanitized;
};

/**
 * Sanitize description field
 * @param description - Raw description
 * @returns Sanitized description
 */
export const sanitizeDescription = (description: string): string => {
  return DOMPurify.sanitize(description, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i'],
    ALLOWED_ATTR: [],
  });
};

/**
 * Sanitize customer name for display
 * @param name - Raw customer name
 * @returns Sanitized name
 */
export const sanitizeCustomerName = (name: string): string => {
  return DOMPurify.sanitize(name, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  }).trim();
};

/**
 * Sanitize vehicle information
 * @param info - Vehicle information object
 * @returns Sanitized vehicle information
 */
export const sanitizeVehicleInfo = (info: {
  make?: string;
  model?: string;
  plate?: string;
  vin?: string;
}) => {
  return {
    make: info.make ? DOMPurify.sanitize(info.make, { ALLOWED_TAGS: [] }) : '',
    model: info.model ? DOMPurify.sanitize(info.model, { ALLOWED_TAGS: [] }) : '',
    plate: info.plate ? DOMPurify.sanitize(info.plate, { ALLOWED_TAGS: [] }) : '',
    vin: info.vin ? DOMPurify.sanitize(info.vin, { ALLOWED_TAGS: [] }) : '',
  };
};