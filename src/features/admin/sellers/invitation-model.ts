export type SellerInvitationInput = {
  sellerName: string;
  phone: string;
  email: string;
  storeName: string;
  address: string;
  category: string;
  password: string;
  clientKey: string;
};
export function validateInvitation(data: SellerInvitationInput): string {
  if (data.sellerName.trim().length < 2 || data.storeName.trim().length < 2)
    return "Enter the seller name and store name (at least 2 characters each).";
  if (!/^[6-9]\d{9}$/.test(data.phone))
    return "Enter a valid 10-digit Indian mobile number.";
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()) ||
    data.email.length > 254
  )
    return "Enter a valid recovery email.";
  if (data.address.trim().length < 10 || !data.category.trim())
    return "Enter the complete address and store category.";
  if (data.password.length < 12 || data.password.length > 128)
    return "Use an initial password of 12–128 characters.";
  return "";
}
