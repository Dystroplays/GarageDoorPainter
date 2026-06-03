import type { AirtableContact, AirtableBooking } from "@/types";

const BASE_URL = "https://api.airtable.com/v0";

const CONTACTS = "Contacts";
const BOOKINGS = "Bookings";
const PAINTERS = "Painters";
const PAINT_ORDERS = "Paint Orders";

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
    "Content-Type": "application/json",
  };
}

function baseUrl(table: string) {
  return `${BASE_URL}/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`;
}

async function airtableFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: { ...getHeaders(), ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable error ${res.status}: ${body}`);
  }
  return res.json();
}

// --- Contacts ---

export async function upsertContact(
  data: Omit<AirtableContact, "id">
): Promise<string> {
  const filter = encodeURIComponent(`{Email} = "${data.Email}"`);
  const existing = await airtableFetch(
    `${baseUrl(CONTACTS)}?filterByFormula=${filter}&maxRecords=1`
  );

  if (existing.records?.length > 0) {
    const id = existing.records[0].id as string;
    await airtableFetch(`${baseUrl(CONTACTS)}/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        fields: {
          Name: data.Name,
          Status: data.Status,
          ...(data.Phone && { Phone: data.Phone }),
          ...(data.Address && { Address: data.Address }),
        },
      }),
    });
    return id;
  }

  const created = await airtableFetch(baseUrl(CONTACTS), {
    method: "POST",
    body: JSON.stringify({
      records: [
        {
          fields: {
            Name: data.Name,
            Email: data.Email,
            Status: data.Status,
            Source: data.Source,
            ...(data.Phone && { Phone: data.Phone }),
            ...(data.Address && { Address: data.Address }),
          },
        },
      ],
    }),
  });
  return created.records[0].id as string;
}

export async function updateContactStatus(
  id: string,
  status: AirtableContact["Status"]
) {
  await airtableFetch(`${baseUrl(CONTACTS)}/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: { Status: status } }),
  });
}

export async function updateContact(
  id: string,
  fields: { Phone?: string; Address?: string }
) {
  await airtableFetch(`${baseUrl(CONTACTS)}/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ fields }),
  });
}

// --- Bookings ---

export async function createBooking(
  data: Record<string, unknown>
): Promise<string> {
  const result = await airtableFetch(baseUrl(BOOKINGS), {
    method: "POST",
    body: JSON.stringify({ records: [{ fields: data }] }),
  });
  return result.records[0].id as string;
}

export async function updateBooking(
  id: string,
  data: Record<string, unknown>
) {
  await airtableFetch(`${baseUrl(BOOKINGS)}/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: data }),
  });
}

export async function getBookedDateRanges(): Promise<
  Array<{ start: string; end: string }>
> {
  const filter = encodeURIComponent(
    `OR({Status} = "Scheduled", {Status} = "In Progress")`
  );
  const result = await airtableFetch(
    `${baseUrl(BOOKINGS)}?filterByFormula=${filter}&fields%5B%5D=Scheduled%20Start&fields%5B%5D=Scheduled%20End`
  );

  return (result.records ?? [])
    .map((r: { fields: Record<string, string> }) => ({
      start: r.fields["Scheduled Start"],
      end: r.fields["Scheduled End"],
    }))
    .filter((r: { start: string; end: string }) => r.start && r.end);
}

export async function getBlockedDates(): Promise<string[]> {
  try {
    const filter = encodeURIComponent(`{Blocked} = TRUE()`);
    const result = await airtableFetch(
      `${baseUrl(BOOKINGS)}?filterByFormula=${filter}&fields%5B%5D=Scheduled%20Start`
    );
    return (result.records ?? [])
      .map((r: { fields: Record<string, string> }) => r.fields["Scheduled Start"])
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function getBookingById(id: string) {
  const result = await airtableFetch(`${baseUrl(BOOKINGS)}/${id}`);
  return { id, fields: result.fields as Record<string, unknown> };
}

// --- Paint Orders ---

export async function createPaintOrders(
  bookingId: string,
  orders: Array<{
    swCode: string;
    swColorName: string;
    gallons: number;
    primerNeeded: boolean;
    primerGallons: number;
    painterId?: string;
    jobDate: string;
  }>
) {
  if (orders.length === 0) return;

  const records = orders.map((o) => ({
    fields: {
      Booking: [bookingId],
      "SW Code": o.swCode,
      "SW Color Name": o.swColorName,
      "Gallons Needed": o.gallons,
      "Primer Needed": o.primerNeeded,
      "Primer Gallons": o.primerGallons,
      "Job Date": o.jobDate,
      "Order Status": "Pending",
      ...(o.painterId && { Painter: [o.painterId] }),
    },
  }));

  await airtableFetch(baseUrl(PAINT_ORDERS), {
    method: "POST",
    body: JSON.stringify({ records }),
  });
}

// --- Painters ---

export async function getActivePainters(): Promise<
  Array<{ id: string; name: string }>
> {
  const filter = encodeURIComponent(`{Active} = TRUE()`);
  const result = await airtableFetch(
    `${baseUrl(PAINTERS)}?filterByFormula=${filter}`
  );
  return (result.records ?? []).map(
    (r: { id: string; fields: Record<string, string> }) => ({
      id: r.id,
      name: r.fields["Name"],
    })
  );
}

export async function getPainterByToken(
  token: string
): Promise<{ id: string; name: string; phone?: string } | null> {
  const filter = encodeURIComponent(`{Painter Token} = "${token}"`);
  const result = await airtableFetch(
    `${baseUrl(PAINTERS)}?filterByFormula=${filter}&maxRecords=1`
  );
  const record = result.records?.[0];
  if (!record) return null;
  return {
    id: record.id as string,
    name: record.fields["Name"] as string,
    phone: record.fields["Phone"] as string | undefined,
  };
}

export async function getPainterById(
  id: string
): Promise<{ id: string; name: string; phone?: string } | null> {
  try {
    const result = await airtableFetch(`${baseUrl(PAINTERS)}/${id}`);
    return {
      id: result.id as string,
      name: result.fields["Name"] as string,
      phone: result.fields["Phone"] as string | undefined,
    };
  } catch {
    return null;
  }
}

// Returns bookings assigned to a painter that are not completed/cancelled.
// Also includes jobs completed in the last 7 days for record.
export async function getPainterJobs(painterId: string): Promise<
  Array<{ id: string; fields: Record<string, unknown> }>
> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString().split("T")[0];

  const filter = encodeURIComponent(
    `AND(
      FIND("${painterId}", ARRAYJOIN({Assigned Painter}, ",")),
      OR(
        {Status} = "Scheduled",
        {Status} = "In Progress",
        AND({Status} = "Completed", {Scheduled Start} >= "${cutoff}")
      )
    )`
  );

  const result = await airtableFetch(
    `${baseUrl(BOOKINGS)}?filterByFormula=${filter}&sort%5B0%5D%5Bfield%5D=Scheduled%20Start&sort%5B0%5D%5Bdirection%5D=asc`
  );

  return (result.records ?? []).map(
    (r: { id: string; fields: Record<string, unknown> }) => ({
      id: r.id,
      fields: r.fields,
    })
  );
}

// Returns active bookings (Scheduled + In Progress) for admin view.
export async function getActiveBookings(): Promise<
  Array<{ id: string; fields: Record<string, unknown> }>
> {
  const filter = encodeURIComponent(
    `OR({Status} = "Scheduled", {Status} = "In Progress")`
  );
  const result = await airtableFetch(
    `${baseUrl(BOOKINGS)}?filterByFormula=${filter}&sort%5B0%5D%5Bfield%5D=Scheduled%20Start&sort%5B0%5D%5Bdirection%5D=asc`
  );
  return (result.records ?? []).map(
    (r: { id: string; fields: Record<string, unknown> }) => ({
      id: r.id,
      fields: r.fields,
    })
  );
}
