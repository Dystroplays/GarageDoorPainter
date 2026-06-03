export type DoorSize = "single" | "double";
export type CurrentColorTone = "light" | "dark";

export interface SWColor {
  sw_code: string;
  name: string;
  hex: string;
  lrv: number;
  family: string;
  popular?: boolean;
}

export interface DoorConfig {
  id: string;
  size: DoorSize;
  currentTone: CurrentColorTone;
  selectedColor: SWColor | null;
}

export interface LineItem {
  label: string;
  amount: number;
  type: "base" | "discount" | "primer";
}

export interface PriceBreakdown {
  customQuote: boolean;
  subtotal: number;
  discount: number;
  primerCharges: number;
  total: number;
  depositAmount: number;
  balanceAmount: number;
  lineItems: LineItem[];
}

export interface BookingFormData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  doors: DoorConfig[];
  pricing: PriceBreakdown;
  selectedStartDate: string; // ISO date string
  selectedEndDate: string;
  leadId?: string;
}

export interface AirtableContact {
  id?: string;
  Name: string;
  Email: string;
  Phone?: string;
  Address?: string;
  Source: "Facebook Ad" | "Postcard" | "Referral" | "Organic";
  Status: "Lead" | "Booked" | "Completed" | "Cancelled";
}

export interface AirtableBooking {
  id?: string;
  Contact: string[]; // linked record IDs
  "Door 1 Size"?: "Single" | "Double";
  "Door 1 Color SW Code"?: string;
  "Door 1 Color Name"?: string;
  "Door 1 Primer"?: boolean;
  "Door 2 Size"?: "Single" | "Double";
  "Door 2 Color SW Code"?: string;
  "Door 2 Color Name"?: string;
  "Door 2 Primer"?: boolean;
  "Door 3 Size"?: "Single" | "Double";
  "Door 3 Color SW Code"?: string;
  "Door 3 Color Name"?: string;
  "Door 3 Primer"?: boolean;
  "Door 4 Size"?: "Single" | "Double";
  "Door 4 Color SW Code"?: string;
  "Door 4 Color Name"?: string;
  "Door 4 Primer"?: boolean;
  "Door 5 Size"?: "Single" | "Double";
  "Door 5 Color SW Code"?: string;
  "Door 5 Color Name"?: string;
  "Door 5 Primer"?: boolean;
  "Subtotal"?: number;
  "Discount"?: number;
  "Primer Charges"?: number;
  "Deposit Paid"?: boolean;
  "Balance Charged"?: boolean;
  "Square Customer ID"?: string;
  "Square Deposit Payment ID"?: string;
  "Square Card ID"?: string;
  "Square Balance Payment ID"?: string;
  "Scheduled Start"?: string;
  "Scheduled End"?: string;
  "Assigned Painter"?: string[];
  Status: "Scheduled" | "In Progress" | "Completed" | "Cancelled";
  Notes?: string;
}

export interface AvailableDate {
  date: string; // ISO date string YYYY-MM-DD
  available: boolean;
}

export interface FunnelStep {
  step: 1 | 2 | 3 | 4 | 5;
  label: string;
}
