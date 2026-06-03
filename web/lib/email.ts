import { Resend } from "resend";
import { format, parseISO } from "date-fns";

interface ConfirmationParams {
  to: string;
  customerName: string;
  bookingId: string;
  startDate: string;
  endDate: string;
  doors: { size: string; colorName: string; swCode: string; primerNeeded: boolean }[];
  total: number;
  depositAmount: number;
  balanceAmount: number;
}

function formatCents(dollars: number) {
  return `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

function buildConfirmationHtml(p: ConfirmationParams): string {
  const isSameDay = p.startDate === p.endDate;
  const dateStr = isSameDay
    ? format(parseISO(p.startDate), "EEEE, MMMM d, yyyy")
    : `${format(parseISO(p.startDate), "EEE, MMM d")} – ${format(parseISO(p.endDate), "EEE, MMM d, yyyy")}`;

  const doorRows = p.doors
    .map(
      (d, i) =>
        `<tr>
          <td style="padding:6px 0;color:#374151;">Door ${i + 1}: ${d.size === "single" ? "Single" : "Double"}-car</td>
          <td style="padding:6px 0;color:#374151;">${d.colorName} (${d.swCode})${d.primerNeeded ? " + primer" : ""}</td>
        </tr>`
    )
    .join("");

  const contactPhone = process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Inter,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#000000;padding:32px 40px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#fdb617;letter-spacing:-0.5px;">BOLT PAINTING</div>
            <div style="font-size:13px;color:#9ca3af;margin-top:4px;">Garage Door Refresh</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin-bottom:28px;text-align:center;">
              <span style="color:#16a34a;font-weight:700;font-size:16px;">✓ Booking Confirmed</span>
            </div>

            <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#111111;">Hi ${p.customerName},</p>
            <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
              You're on the schedule! Here's a summary of your Bolt Painting garage door job.
            </p>

            <!-- Date -->
            <div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin-bottom:16px;">
              <div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Scheduled Date</div>
              <div style="font-size:16px;font-weight:700;color:#111111;">${dateStr}</div>
            </div>

            <!-- Doors -->
            <div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin-bottom:16px;">
              <div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;">Your Doors</div>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${doorRows}
              </table>
            </div>

            <!-- Pricing -->
            <div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin-bottom:28px;">
              <div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;">Payment</div>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:4px 0;color:#6b7280;font-size:14px;">Total</td>
                  <td style="padding:4px 0;color:#111111;font-weight:600;font-size:14px;text-align:right;">${formatCents(p.total)}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#6b7280;font-size:14px;">Deposit charged today</td>
                  <td style="padding:4px 0;color:#111111;font-weight:600;font-size:14px;text-align:right;">${formatCents(p.depositAmount)}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#6b7280;font-size:14px;">Balance due at completion</td>
                  <td style="padding:4px 0;color:#111111;font-weight:600;font-size:14px;text-align:right;">${formatCents(p.balanceAmount)}</td>
                </tr>
              </table>
            </div>

            <!-- What's next -->
            <div style="margin-bottom:28px;">
              <div style="font-size:14px;font-weight:700;color:#111111;margin-bottom:12px;">What Happens Next</div>
              <div style="font-size:14px;color:#6b7280;line-height:1.7;">
                1. We'll pick up your Sherwin-Williams paint 2 days before your job.<br>
                2. Our painter arrives on your scheduled date — no need to be home.<br>
                3. The remaining balance is charged to your card on file when complete.<br>
                4. You'll receive before &amp; after photos and a Google review request.
              </div>
            </div>

            <!-- Booking ID -->
            <div style="font-size:12px;color:#9ca3af;margin-bottom:28px;">
              Booking reference: <span style="font-family:monospace;">${p.bookingId}</span>
            </div>

            <!-- Contact -->
            ${
              contactPhone
                ? `<div style="text-align:center;padding:20px;background:#fafafa;border-radius:10px;border:1px solid #e5e7eb;">
              <div style="font-size:13px;color:#6b7280;">Questions? Call or text us</div>
              <a href="tel:${contactPhone}" style="font-size:18px;font-weight:700;color:#000000;text-decoration:none;">${contactPhone}</a>
            </div>`
                : ""
            }
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#000000;padding:24px 40px;text-align:center;">
            <div style="font-size:12px;color:#6b7280;">
              © Bolt Painting · DFW Garage Door Refresh<br>
              This is a transactional email for your booking.
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

interface CompletionParams {
  to: string;
  customerName: string;
  bookingId: string;
  afterPhotoUrls: string[];
  balanceAmount: number;
  reviewLink?: string;
}

function buildCompletionHtml(p: CompletionParams): string {
  const reviewLink = p.reviewLink ?? "https://g.page/r/bolt-painting/review";
  const photoRows = p.afterPhotoUrls
    .map(
      (url) =>
        `<tr><td style="padding:4px 0;"><img src="${url}" alt="After photo" style="width:100%;max-width:480px;border-radius:8px;" /></td></tr>`
    )
    .join("");

  const contactPhone = process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Inter,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;max-width:560px;width:100%;">

        <tr>
          <td style="background:#000000;padding:32px 40px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#fdb617;letter-spacing:-0.5px;">BOLT PAINTING</div>
            <div style="font-size:13px;color:#9ca3af;margin-top:4px;">Job Complete</div>
          </td>
        </tr>

        <tr>
          <td style="padding:40px 40px 32px;">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin-bottom:28px;text-align:center;">
              <span style="color:#16a34a;font-weight:700;font-size:16px;">✓ Your garage door is done!</span>
            </div>

            <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#111111;">Hi ${p.customerName},</p>
            <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.6;">
              Great news — your garage door refresh is complete. Here are the after photos, and the remaining balance has been charged to your card on file.
            </p>

            ${
              p.afterPhotoUrls.length > 0
                ? `<div style="margin-bottom:28px;">
              <div style="font-size:14px;font-weight:700;color:#111111;margin-bottom:12px;">After Photos</div>
              <table width="100%" cellpadding="0" cellspacing="0">${photoRows}</table>
            </div>`
                : ""
            }

            <div style="background:#fafafa;border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin-bottom:28px;">
              <div style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Balance Charged</div>
              <div style="font-size:20px;font-weight:700;color:#111111;">$${p.balanceAmount.toLocaleString("en-US", { minimumFractionDigits: 0 })}</div>
              <div style="font-size:13px;color:#6b7280;margin-top:4px;">Charged to your card on file</div>
            </div>

            <div style="text-align:center;margin-bottom:28px;">
              <a href="${reviewLink}" style="display:inline-block;background:#fdb617;color:#000000;font-weight:700;font-size:15px;padding:14px 32px;border-radius:50px;text-decoration:none;">
                Leave Us a Google Review ★
              </a>
              <p style="margin-top:12px;font-size:13px;color:#9ca3af;">It takes 30 seconds and means the world to us.</p>
            </div>

            <div style="font-size:12px;color:#9ca3af;margin-bottom:28px;">
              Booking reference: <span style="font-family:monospace;">${p.bookingId}</span>
            </div>

            ${
              contactPhone
                ? `<div style="text-align:center;padding:20px;background:#fafafa;border-radius:10px;border:1px solid #e5e7eb;">
              <div style="font-size:13px;color:#6b7280;">Questions? Call or text us</div>
              <a href="tel:${contactPhone}" style="font-size:18px;font-weight:700;color:#000000;text-decoration:none;">${contactPhone}</a>
            </div>`
                : ""
            }
          </td>
        </tr>

        <tr>
          <td style="background:#000000;padding:24px 40px;text-align:center;">
            <div style="font-size:12px;color:#6b7280;">
              © Bolt Painting · DFW Garage Door Refresh<br>
              This is a transactional email for your completed job.
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendJobCompletion(params: CompletionParams): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping completion email");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromAddress = process.env.EMAIL_FROM ?? "Bolt Painting <booking@dfwgaragedoorpainter.com>";

  const { error } = await resend.emails.send({
    from: fromAddress,
    to: params.to,
    subject: "Your garage door is done! 🎉",
    html: buildCompletionHtml(params),
  });

  if (error) {
    console.error("[email] Failed to send completion email:", error);
  }
}

export async function sendBookingConfirmation(params: ConfirmationParams): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping confirmation email");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromAddress = process.env.EMAIL_FROM ?? "Bolt Painting <booking@dfwgaragedoorpainter.com>";

  const { error } = await resend.emails.send({
    from: fromAddress,
    to: params.to,
    subject: "Your Bolt Painting booking is confirmed",
    html: buildConfirmationHtml(params),
  });

  if (error) {
    console.error("[email] Failed to send confirmation:", error);
  }
}
