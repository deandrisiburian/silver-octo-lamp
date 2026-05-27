const { connectToWhatsApp, getStatus } = require('../bot/bot');

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const { phoneNumber, method } = req.body;
    
    try {
      await connectToWhatsApp(phoneNumber, method);
      
      // Tunggu sebentar untuk generate kode
      setTimeout(() => {
        const status = getStatus();
        res.status(200).json({
          success: true,
          status: status.status,
          qrCode: status.qrCode,
          pairingCode: status.pairingCode,
          message: method === 'qr' ? 'QR Code generated' : 'Pairing code generated'
        });
      }, 2000);
      
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    const status = getStatus();
    res.status(200).json(status);
  }
};