import type { Client } from '@/lib/backend';
import { isValidEmailFormat } from '@/lib/utils/validators';
import type { TaskFormData } from '../types';
import type { FieldStatus } from './stepFieldShared';

export function mapClientToCustomerForm(client: Client): Partial<TaskFormData> {
  return {
    client_id: client.id,
    customer_name: client.name,
    customer_email: client.email || '',
    customer_phone: client.phone || '',
    customer_address: [
      client.address_street,
      client.address_city,
      client.address_zip,
      client.address_country,
    ]
      .filter(Boolean)
      .join(', '),
  };
}

export function getPrefilledCustomerForm(client: Client): Partial<TaskFormData> {
  const mapped = mapClientToCustomerForm(client);
  return {
    customer_name: mapped.customer_name,
    customer_email: mapped.customer_email,
    customer_phone: mapped.customer_phone,
    customer_address: mapped.customer_address,
  };
}

export function getClearedCustomerForm(): Partial<TaskFormData> {
  return {
    client_id: null,
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_address: '',
  };
}

export function formatFrenchPhoneNumber(value: string) {
  let normalized = value.replace(/\D/g, '');

  if (normalized.startsWith('33')) {
    normalized = `0${normalized.slice(2)}`;
  }

  return normalized
    .slice(0, 10)
    .replace(/(\d{2})(?=\d)/g, '$1 ')
    .trim()
    .slice(0, 14);
}

export function validateEmail(email: string) {
  return isValidEmailFormat(email);
}

export function validatePhone(phone: string) {
  if (!phone) {
    return true;
  }

  return /^(\+33|0)[1-9](\d{8})$/.test(phone.replace(/\s/g, ''));
}

export function getCustomerFieldStatus(
  fieldName: keyof TaskFormData | string,
  formData: TaskFormData,
  errors: Record<string, string>,
): FieldStatus {
  if (errors[fieldName]) {
    return 'error';
  }

  if (fieldName === 'customer_email' && formData.customer_email) {
    return validateEmail(formData.customer_email) ? 'success' : 'error';
  }

  if (fieldName === 'customer_phone' && formData.customer_phone) {
    return validatePhone(formData.customer_phone) ? 'success' : 'error';
  }

  return formData[fieldName as keyof TaskFormData] ? 'success' : 'default';
}

export function isCustomerFormEmpty(formData: TaskFormData) {
  return (
    !formData.customer_name &&
    !formData.customer_email &&
    !formData.customer_phone &&
    !formData.customer_address
  );
}
