import { google } from "googleapis";

// Google's People API (Contacts) free tier quota is generous (thousands of
// requests/day) and requires no billing account for this kind of read-only use.
// You just need a Google Cloud project with OAuth credentials (see README).

export const getOAuthClient = () =>
  new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

export const getAuthUrl = (state) => {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    // Two separate scopes because Google splits contacts into two buckets:
    // - contacts.readonly: people explicitly saved in "My Contacts"
    // - contacts.other.readonly: people auto-collected from Gmail interactions
    //   ("Other contacts") — this is where most classmates/colleagues actually
    //   live if the user never manually added them, so skipping this scope is
    //   the single biggest reason matching finds "nobody" despite real overlap.
    scope: [
      "https://www.googleapis.com/auth/contacts.readonly",
      "https://www.googleapis.com/auth/contacts.other.readonly",
      // Needed to create a Google Calendar event with an attached Meet link.
      // Only "events" (not full calendar access) — we only ever create events,
      // never read or modify the user's existing calendar.
      "https://www.googleapis.com/auth/calendar.events",
    ],
    state,
  });
};

export const getTokensFromCode = async (code) => {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
};

const normalizeContact = (c) => ({
  name: c.names?.[0]?.displayName || "Unknown",
  emails: (c.emailAddresses || []).map((e) => e.value).filter(Boolean),
  phones: (c.phoneNumbers || []).map((p) => p.value).filter(Boolean),
});

// Creates a real Google Meet link, free, using the user's own Google Calendar —
// no third-party meeting service, no per-minute cost, no account limits beyond
// Google's own (generous, free) Calendar API quota.
//
// How it works: Google Calendar can auto-attach a Meet link to any event you
// create if you ask for one (conferenceData.createRequest). We create a short
// "instant meeting" event starting now, grab the generated hangoutLink, and
// hand that URL back — the calendar event itself is just a side effect.
export const createMeetLink = async (refreshToken, summary) => {
  const client = getOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  const calendar = google.calendar({ version: "v3", auth: client });

  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1hr placeholder window

  const { data } = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    requestBody: {
      summary: summary || "Easy Talk call",
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
      conferenceData: {
        createRequest: {
          requestId: `easytalk-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  const meetLink = data.hangoutLink;
  if (!meetLink) {
    throw new Error("Google didn't return a Meet link for this event.");
  }
  return meetLink;
};

export const fetchContacts = async (refreshToken) => {
  const client = getOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  const people = google.people({ version: "v1", auth: client });

  let otherContactsFailed = false;

  // 1. Explicitly-saved contacts ("My Contacts")
  const savedContacts = await people.people.connections
    .list({
      resourceName: "people/me",
      personFields: "names,emailAddresses,phoneNumbers",
      pageSize: 1000,
    })
    .then((res) => (res.data.connections || []).map(normalizeContact))
    .catch(() => []); // e.g. scope not granted on an older connection — degrade gracefully

  // 2. Gmail-auto-collected contacts ("Other contacts") — usually the larger, more
  // useful list for finding people you've actually emailed but never manually saved
  const otherContacts = await people.otherContacts
    .list({
      readMask: "names,emailAddresses,phoneNumbers",
      pageSize: 1000,
    })
    .then((res) => (res.data.otherContacts || []).map(normalizeContact))
    .catch(() => {
      otherContactsFailed = true; // most likely: this account connected before this scope existed
      return [];
    });

  return {
    contacts: [...savedContacts, ...otherContacts],
    otherContactsFailed,
  };
};
