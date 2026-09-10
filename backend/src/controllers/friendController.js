import FriendRequest from "../models/FriendRequest.js";
import User from "../models/User.js";

// POST /api/friends/request  { to: userId }
export const sendFriendRequest = async (req, res) => {
  try {
    const { to } = req.body;
    if (to === req.userId) {
      return res.status(400).json({ message: "You can't send a request to yourself" });
    }

    const existing = await FriendRequest.findOne({
      $or: [
        { from: req.userId, to },
        { from: to, to: req.userId },
      ],
    });
    if (existing) {
      return res.status(409).json({ message: `Request already ${existing.status}` });
    }

    const request = await FriendRequest.create({ from: req.userId, to });
    const populated = await request.populate("from", "username avatar");

    req.io.to(to).emit("friendRequestReceived", populated);
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: "Failed to send request", error: err.message });
  }
};

// POST /api/friends/respond  { requestId, accept: boolean }
export const respondToFriendRequest = async (req, res) => {
  try {
    const { requestId, accept } = req.body;
    const request = await FriendRequest.findOne({ _id: requestId, to: req.userId });
    if (!request) return res.status(404).json({ message: "Request not found" });

    request.status = accept ? "accepted" : "declined";
    await request.save();

    if (accept) {
      await User.findByIdAndUpdate(request.from, { $addToSet: { friends: request.to } });
      await User.findByIdAndUpdate(request.to, { $addToSet: { friends: request.from } });
    }

    req.io.to(request.from.toString()).emit("friendRequestResponded", {
      requestId: request._id,
      accepted: accept,
      by: req.userId,
    });

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: "Failed to respond to request", error: err.message });
  }
};

// GET /api/friends/requests  -> incoming pending requests
export const getIncomingRequests = async (req, res) => {
  const requests = await FriendRequest.find({ to: req.userId, status: "pending" }).populate(
    "from",
    "username avatar email"
  );
  res.json(requests);
};

// GET /api/friends  -> accepted friends list
export const getFriends = async (req, res) => {
  const user = await User.findById(req.userId).populate(
    "friends",
    "username avatar email isOnline lastSeen isBot"
  );
  res.json(user.friends);
};

// GET /api/friends/search?q=  -> browse/find people by username/email who aren't already friends
export const searchUsers = async (req, res) => {
  const q = req.query.q || "";
  const me = await User.findById(req.userId);

  const results = await User.find({
    _id: { $ne: req.userId, $nin: me.friends },
    $or: [
      { username: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
    ],
  })
    .select("username email avatar")
    .limit(50);

  res.json(results);
};
