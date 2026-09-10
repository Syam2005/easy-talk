import User from "../models/User.js";

let cachedBotId = null;

export const ensureBotUser = async () => {
  let bot = await User.findOne({ isBot: true });

  if (!bot) {
    bot = await User.create({
      username: "Easy Talk Assistant",
      email: "assistant@easytalk.local",
      // Random, unused password — the bot never logs in through the normal auth flow.
      password: `${Math.random().toString(36).slice(2)}${Date.now()}`,
      isBot: true,
      isOnline: true,
    });
    console.log("🤖 Created Easy Talk Assistant bot user");
  }

  cachedBotId = bot._id.toString();

  // Make sure every existing (and future) user has the bot in their friends list
  // so it always shows up in the sidebar, no request needed.
  await User.updateMany(
    { _id: { $ne: bot._id }, friends: { $ne: bot._id } },
    { $addToSet: { friends: bot._id } }
  );

  return cachedBotId;
};

export const getBotId = () => cachedBotId;
