import type { DoorConfig, DoorSize, LineItem, PriceBreakdown } from "@/types";

const SINGLE_PRICE = 799;
const DOUBLE_PRICE = 899;
const PRIMER_UPCHARGE = 99;

// PRD §4.2: exact 2-door bundle prices
const TWO_DOOR_BUNDLES: Record<string, number> = {
  "single-single": 1395,
  "single-double": 1495,
  "double-single": 1495,
  "double-double": 1595,
};

// PRD §4.2: per-door discount for 3-5 doors
const VOLUME_DISCOUNTS: Record<number, number> = {
  3: 100,
  4: 125,
  5: 150,
};

export function basePrice(size: DoorSize): number {
  return size === "single" ? SINGLE_PRICE : DOUBLE_PRICE;
}

export function needsPrimer(door: DoorConfig): boolean {
  return (
    door.currentTone === "dark" &&
    door.selectedColor !== null &&
    door.selectedColor.lrv > 50
  );
}

export function calculatePrice(doors: DoorConfig[]): PriceBreakdown {
  const empty: PriceBreakdown = {
    customQuote: false,
    subtotal: 0,
    discount: 0,
    primerCharges: 0,
    total: 0,
    depositAmount: 0,
    balanceAmount: 0,
    lineItems: [],
  };

  if (doors.length === 0) return empty;

  if (doors.length >= 6) {
    return { ...empty, customQuote: true };
  }

  const lineItems: LineItem[] = [];
  let subtotal = 0;
  let discount = 0;

  if (doors.length === 1) {
    const price = basePrice(doors[0].size);
    subtotal = price;
    lineItems.push({
      label: `${doors[0].size === "single" ? "Single" : "Double"}-car door`,
      amount: price,
      type: "base",
    });
  } else if (doors.length === 2) {
    const key = `${doors[0].size}-${doors[1].size}`;
    const bundlePrice = TWO_DOOR_BUNDLES[key] ?? TWO_DOOR_BUNDLES["single-single"];
    doors.forEach((d, i) => {
      const p = basePrice(d.size);
      subtotal += p;
      lineItems.push({
        label: `Door ${i + 1}: ${d.size === "single" ? "single" : "double"}-car`,
        amount: p,
        type: "base",
      });
    });
    discount = subtotal - bundlePrice;
    if (discount > 0) {
      lineItems.push({
        label: "2-door bundle discount",
        amount: -discount,
        type: "discount",
      });
    }
  } else {
    // 3-5 doors
    doors.forEach((d, i) => {
      const p = basePrice(d.size);
      subtotal += p;
      lineItems.push({
        label: `Door ${i + 1}: ${d.size === "single" ? "single" : "double"}-car`,
        amount: p,
        type: "base",
      });
    });
    const perDoor = VOLUME_DISCOUNTS[doors.length] ?? 0;
    discount = perDoor * doors.length;
    if (discount > 0) {
      lineItems.push({
        label: `${doors.length}-door volume discount ($${perDoor}/door)`,
        amount: -discount,
        type: "discount",
      });
    }
  }

  // Primer: dark → light (current dark, selected LRV > 50)
  let primerCharges = 0;
  doors.forEach((d, i) => {
    if (needsPrimer(d)) {
      primerCharges += PRIMER_UPCHARGE;
      lineItems.push({
        label: `Primer — Door ${i + 1} (dark to light)`,
        amount: PRIMER_UPCHARGE,
        type: "primer",
      });
    }
  });

  const total = subtotal - discount + primerCharges;
  const depositAmount = Math.round(total * 0.5);
  const balanceAmount = total - depositAmount;

  return {
    customQuote: false,
    subtotal,
    discount,
    primerCharges,
    total,
    depositAmount,
    balanceAmount,
    lineItems,
  };
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(cents);
}
