export const formatTonAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
};

export const formatBalance = (balance: number): string => {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(balance);
};

export const validateTonAddress = (address: string): boolean => {
  // Basic TON address validation (48 characters, base64-like)
  const tonAddressRegex = /^[A-Za-z0-9_-]{48}$/;
  return tonAddressRegex.test(address);
};