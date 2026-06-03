import { SquareClient, SquareEnvironment } from "square";

function getSquare() {
  const env = process.env.SQUARE_ENVIRONMENT === "production"
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox;
  return new SquareClient({
    token: process.env.SQUARE_ACCESS_TOKEN!,
    environment: env,
  });
}

export async function createSquareCustomerAndChargeDeposit(
  email: string,
  name: string,
  sourceId: string,
  depositAmountDollars: number,
  bookingId: string
): Promise<{ customerId: string; cardId: string; paymentId: string }> {
  const client = getSquare();

  const nameParts = name.trim().split(" ");
  const givenName = nameParts[0];
  const familyName = nameParts.slice(1).join(" ") || undefined;

  const customerRes = await client.customers.create({
    emailAddress: email,
    givenName,
    familyName,
    referenceId: bookingId,
  });
  const customerId = customerRes.customer?.id;
  if (!customerId) {
    throw new Error("Failed to create Square customer");
  }

  // Vault the card — nonce is consumed here
  const cardRes = await client.cards.create({
    idempotencyKey: crypto.randomUUID(),
    sourceId,
    card: { customerId },
  });
  const cardId = cardRes.card?.id;
  if (!cardId) {
    throw new Error("Failed to vault card with Square");
  }

  // Charge deposit using the vaulted card
  const paymentRes = await client.payments.create({
    idempotencyKey: crypto.randomUUID(),
    sourceId: cardId,
    amountMoney: { amount: BigInt(Math.round(depositAmountDollars * 100)), currency: "USD" },
    customerId,
    referenceId: bookingId,
    note: "Garage door painting deposit — Bolt Painting",
    buyerEmailAddress: email,
  });
  const paymentId = paymentRes.payment?.id;
  if (!paymentId) {
    throw new Error("Failed to charge deposit with Square");
  }

  return { customerId, cardId, paymentId };
}

export async function refundSquareDeposit(
  paymentId: string,
  reason: string
): Promise<void> {
  const client = getSquare();
  // Fetch payment to get the amount for the full refund
  const paymentRes = await client.payments.get({ paymentId });
  const amount = paymentRes.payment?.amountMoney;
  if (!amount) throw new Error("Could not retrieve payment amount for refund");
  await client.refunds.refundPayment({
    idempotencyKey: crypto.randomUUID(),
    paymentId,
    amountMoney: amount,
    reason,
  });
}

export async function chargeSquareBalanceOnFile(
  cardId: string,
  balanceAmountDollars: number,
  bookingId: string,
  idempotencyKey: string
): Promise<string> {
  const client = getSquare();

  const paymentRes = await client.payments.create({
    idempotencyKey,
    sourceId: cardId,
    amountMoney: { amount: BigInt(Math.round(balanceAmountDollars * 100)), currency: "USD" },
    referenceId: bookingId,
    note: "Garage door painting balance — Bolt Painting",
  });
  const paymentId = paymentRes.payment?.id;
  if (!paymentId) {
    throw new Error("Failed to charge balance with Square");
  }
  return paymentId;
}
