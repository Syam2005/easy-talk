import Group from "../models/Group.js";
import GroupInvite from "../models/GroupInvite.js";
import Message from "../models/Message.js";

// POST /api/groups  { name, memberIds: [] }
export const createGroup = async (req, res) => {
  try {
    const { name, memberIds = [] } = req.body;
    if (!name) return res.status(400).json({ message: "Group name is required" });

    const group = await Group.create({
      name,
      admin: req.userId,
      members: [req.userId], // creator joins immediately
    });

    // Everyone else gets an invite they must accept before joining.
    // Upsert so re-inviting someone who previously declined works too.
    for (const memberId of memberIds) {
      if (memberId === req.userId) continue;

      const invite = await GroupInvite.findOneAndUpdate(
        { group: group._id, invitedUser: memberId },
        { status: "pending", invitedBy: req.userId },
        { upsert: true, new: true }
      );

      const populated = await invite.populate([
        { path: "group", select: "name" },
        { path: "invitedBy", select: "username" },
      ]);
      req.io.to(memberId).emit("groupInviteReceived", populated);
    }

    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ message: "Failed to create group", error: err.message });
  }
};

// POST /api/groups/:groupId/invite  { userId }
export const inviteToGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.members.includes(req.userId)) {
      return res.status(403).json({ message: "Only members can invite others" });
    }
    if (group.members.includes(userId)) {
      return res.status(409).json({ message: "That person is already in the group" });
    }

    const invite = await GroupInvite.findOneAndUpdate(
      { group: groupId, invitedUser: userId },
      { status: "pending", invitedBy: req.userId },
      { upsert: true, new: true }
    );
    const populated = await invite.populate([
      { path: "group", select: "name" },
      { path: "invitedBy", select: "username" },
    ]);

    req.io.to(userId).emit("groupInviteReceived", populated);
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: "Failed to invite", error: err.message });
  }
};

// POST /api/groups/invites/respond  { inviteId, accept }
export const respondToGroupInvite = async (req, res) => {
  try {
    const { inviteId, accept } = req.body;
    const invite = await GroupInvite.findOne({ _id: inviteId, invitedUser: req.userId });
    if (!invite) return res.status(404).json({ message: "Invite not found" });

    invite.status = accept ? "accepted" : "declined";
    await invite.save();

    if (accept) {
      const group = await Group.findByIdAndUpdate(
        invite.group,
        { $addToSet: { members: req.userId } },
        { new: true }
      ).populate("members", "username avatar isOnline");

      // Tell existing members someone joined (they're already in the room)
      req.io.to(`group:${invite.group.toString()}`).emit("groupMemberJoined", {
        groupId: invite.group,
        userId: req.userId,
      });

      // Tell the NEW member directly on their personal channel — they haven't
      // joined the socket room yet, so a room broadcast alone would never reach them.
      req.io.to(req.userId).emit("addedToGroup", { group });

      return res.json({ invite, group });
    }

    res.json({ invite });
  } catch (err) {
    res.status(500).json({ message: "Failed to respond to invite", error: err.message });
  }
};

// GET /api/groups/invites -> my pending invites
export const getMyGroupInvites = async (req, res) => {
  const invites = await GroupInvite.find({ invitedUser: req.userId, status: "pending" }).populate([
    { path: "group", select: "name" },
    { path: "invitedBy", select: "username" },
  ]);
  res.json(invites);
};

// GET /api/groups -> groups I'm a member of
export const getMyGroups = async (req, res) => {
  const groups = await Group.find({ members: req.userId }).populate(
    "members",
    "username avatar isOnline"
  );
  res.json(groups);
};

// GET /api/groups/:groupId/messages
export const getGroupMessages = async (req, res) => {
  const { groupId } = req.params;
  const group = await Group.findById(groupId);
  if (!group || !group.members.includes(req.userId)) {
    return res.status(403).json({ message: "You are not a member of this group" });
  }
  const messages = await Message.find({ group: groupId })
    .sort({ createdAt: 1 })
    .limit(500)
    .populate("sender", "username avatar");
  res.json(messages);
};

// DELETE /api/groups/:groupId/leave
export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.members.some((m) => m.toString() === req.userId)) {
      return res.status(403).json({ message: "You're not a member of this group" });
    }

    group.members = group.members.filter((m) => m.toString() !== req.userId);

    if (group.members.length === 0) {
      // Last person out — nothing left to keep around
      await Group.findByIdAndDelete(groupId);
      return res.json({ message: "Left group", deleted: true });
    }

    // If the admin left, hand the role to whoever's been in the group longest
    if (group.admin.toString() === req.userId) {
      group.admin = group.members[0];
    }
    await group.save();

    // Tell whoever's still in the group, in real time
    req.io.to(`group:${groupId}`).emit("groupMemberLeft", { groupId, userId: req.userId });

    res.json({ message: "Left group", deleted: false });
  } catch (err) {
    res.status(500).json({ message: "Failed to leave group", error: err.message });
  }
};
