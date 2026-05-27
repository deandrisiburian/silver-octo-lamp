const { getStatus, getStats } = require('../bot/bot');

module.exports = async (req, res) => {
  const status = getStatus();
  const stats = getStats();
  
  res.status(200).json({
    ...status,
    stats: {
      uptime: Date.now() - stats.startTime,
      messagesProcessed: stats.messagesProcessed,
      commandsUsed: stats.commandsUsed
    }
  });
};