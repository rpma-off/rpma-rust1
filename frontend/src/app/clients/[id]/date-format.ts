export const formatClientDate = (value: string | null | undefined): string =>
  value ? new Date(value).toLocaleDateString('fr-FR') : 'N/A';
