const { sock } = require('../bot/bot');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { to, message } = req.body;
  const botSock = sock();
  
  if (!botSock) {
    return res.status(400).json({ error: 'Bot not connected' });
  }
  
  try {
    await botSock.sendMessage(`${to}@s.whatsapp.net`, { text: message });
    res.status(200).json({ success: true, message: 'Message sent' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};