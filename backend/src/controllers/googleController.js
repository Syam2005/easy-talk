import User from "../models/User.js";
import {
  getAuthUrl,
  getTokensFromCode,
  fetchContacts,
} from "../services/googleContactsService.js";

const isGoogleConfigured = () =>
  Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI &&
      process.env.GOOGLE_CLIENT_ID !== "your_google_client_id"
  );

// GET /api/google/auth-url  -> returns the URL the frontend should redirect to
export const getGoogleAuthUrl = (req, res) => {
  if (!isGoogleConfigured()) {
    return res.status(400).json({
      message:
        "Google Contacts import isn't set up yet. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI to backend/.env (see README section on Google Contacts setup).",
    });
  }
  // Encode the userId in state so the callback knows who to attach tokens to
  const url = getAuthUrl(req.userId);
  res.json({ url });
};

// GET /api/google/callback?code=...&state=userId
// Google redirects here after consent
export const googleCallback = async (req, res) => {
  const { code, state, error: googleError } = req.query;

  if (googleError) {
    // User clicked "Cancel" on Google's consent screen, or Google itself rejected the request
    return res.redirect(`${process.env.CLIENT_URL}/?googleConnected=0&reason=denied`);
  }

  try {
    const tokens = await getTokensFromCode(code);

    if (!tokens.refresh_token) {
      return res.redirect(`${process.env.CLIENT_URL}/?googleConnected=0&reason=no_refresh_token`);
    }

    await User.findByIdAndUpdate(state, { googleRefreshToken: tokens.refresh_token });
    res.redirect(`${process.env.CLIENT_URL}/?googleConnected=1`);
  } catch (err) {
    console.error("Google OAuth callback failed:", err.message);
    // Most common real cause: GOOGLE_REDIRECT_URI doesn't exactly match what's
    // registered in Google Cloud Console for this OAuth client.
    res.redirect(`${process.env.CLIENT_URL}/?googleConnected=0&reason=exchange_failed`);
  }
};

// GET /api/google/status -> is this account currently connected to Google?
export const getGoogleStatus = async (req, res) => {
  const me = await User.findById(req.userId);
  res.json({
    connected: Boolean(me.googleRefreshToken),
    configured: isGoogleConfigured(),
  });
};

// GET /api/google/matched-contacts
// Fetches the user's Google contacts and matches them against existing Easy Talk users by email
export const getMatchedContacts = async (req, res) => {
  try {
    if (!isGoogleConfigured()) {
      return res.status(400).json({ message: "Google Contacts import isn't set up on this server yet." });
    }

    const me = await User.findById(req.userId);
    if (!me.googleRefreshToken) {
      return res.status(400).json({ message: "Connect your Google account first." });
    }

    const { contacts, otherContactsFailed } = await fetchContacts(me.googleRefreshToken);

    // Dedupe contacts by email (a person can show up multiple times across
    // "My Contacts" and "Other contacts"), lowercased so matching is consistent
    // with how Easy Talk stores account emails.
    const emailToName = {};
    contacts.forEach((c) => {
      c.emails.forEach((e) => {
        const email = e.toLowerCase().trim();
        if (!emailToName[email]) emailToName[email] = c.name;
      });
    });
    const allEmails = Object.keys(emailToName);

    const matchedUsers = allEmails.length
      ? await User.find({
          email: { $in: allEmails },
          _id: { $ne: req.userId },
        }).select("username email avatar")
      : [];
    const matchedByEmail = {};
    matchedUsers.forEach((u) => {
      matchedByEmail[u.email] = u;
    });

    // The full list: everyone from Google contacts, each tagged with whether
    // they already have an Easy Talk account (so the UI can offer "Add" for
    // them, or "Invite" for everyone else).
    const allContacts = allEmails
      .map((email) => {
        const matchedUser = matchedByEmail[email];
        return {
          email,
          name: emailToName[email],
          onEasyTalk: Boolean(matchedUser),
          user: matchedUser
            ? { _id: matchedUser._id, username: matchedUser.username, avatar: matchedUser.avatar }
            : null,
        };
      })
      .sort((a, b) => Number(b.onEasyTalk) - Number(a.onEasyTalk) || a.name.localeCompare(b.name));

    res.json({
      totalContacts: allEmails.length,
      allContacts,
      matchedOnEasyTalk: matchedUsers,
      // Lets the frontend suggest reconnecting if this account granted access
      // before the "other contacts" scope was added, since that bucket usually
      // has the most people worth matching against.
      suggestReconnect: otherContactsFailed,
    });
  } catch (err) {
    console.error("Failed to fetch Google contacts:", err.message);
    // A refresh token can go bad if the user revoked access from their Google account
    const isAuthError = err.message?.includes("invalid_grant") || err.message?.includes("invalid_token");
    if (isAuthError) {
      await User.findByIdAndUpdate(req.userId, { googleRefreshToken: "" });
      return res.status(401).json({
        message: "Your Google connection expired or was revoked. Please connect your Google account again.",
      });
    }
    res.status(500).json({ message: "Failed to fetch Google contacts", error: err.message });
  }
};

// POST /api/google/disconnect -> remove the stored refresh token
export const disconnectGoogle = async (req, res) => {
  await User.findByIdAndUpdate(req.userId, { googleRefreshToken: "" });
  res.json({ message: "Disconnected from Google" });
};
