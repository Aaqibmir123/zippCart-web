export type AddressInput = {
  name: string;
  phone: string;
  line1: string;
  locality: string;
  district: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  label: "Home" | "Work" | "Other";
};
export type OrderItem = {
  productId: string;
  name: string;
  price: number;
  mrp?: number;
  quantity: number;
  color: string;
  size: string;
  coverImage: string | null;
};
export type OrderCancellation = {
  reason: string;
  at: string;
  actorRole: "customer";
  stockRestoredAt?: string | null;
};
