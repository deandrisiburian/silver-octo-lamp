let statusCheckInterval;

document.getElementById('connectBtn').addEventListener('click', async () => {
    const phoneNumber = document.getElementById('phoneNumber').value;
    const method = document.querySelector('input[name="method"]:checked').value;
    
    if (!phoneNumber && method === 'pairing') {
        alert('Nomor WhatsApp diperlukan untuk pairing code');
        return;
    }
    
    const connectBtn = document.getElementById('connectBtn');
    connectBtn.disabled = true;
    connectBtn.textContent = 'Menghubungkan...';
    
    try {
        const response = await fetch('/api/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber, method })
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('statusCard').classList.remove('hidden');
            document.getElementById('botCommands').classList.remove('hidden');
            
            if (method === 'qr') {
                document.getElementById('qrContainer').classList.remove('hidden');
                document.getElementById('pairingContainer').classList.add('hidden');
                displayQRCode(data.qrCode);
            } else {
                document.getElementById('qrContainer').classList.add('hidden');
                document.getElementById('pairingContainer').classList.remove('hidden');
                document.getElementById('pairingCode').textContent = data.pairingCode;
            }
            
            startStatusCheck();
        } else {
            alert('Gagal connect: ' + data.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        connectBtn.disabled = false;
        connectBtn.textContent = '🔌 Connect Bot';
    }
});

function displayQRCode(qrCode) {
    const qrContainer = document.getElementById('qrCode');
    qrContainer.innerHTML = '';
    
    // Gunakan library QR code jika diperlukan, untuk sekarang tampilkan teks
    const pre = document.createElement('pre');
    pre.textContent = qrCode;
    pre.style.fontSize = '12px';
    pre.style.overflow = 'auto';
    qrContainer.appendChild(pre);
}

async function startStatusCheck() {
    if (statusCheckInterval) clearInterval(statusCheckInterval);
    
    statusCheckInterval = setInterval(async () => {
        try {
            const response = await fetch('/api/status');
            const status = await response.json();
            
            updateStatusUI(status);
            
            if (status.status === 'connected') {
                clearInterval(statusCheckInterval);
                showSuccessMessage();
            }
        } catch (error) {
            console.error('Status check error:', error);
        }
    }, 3000);
}

function updateStatusUI(status) {
    const statusDiv = document.getElementById('connectionStatus');
    const statusText = statusDiv.querySelector('.status-text');
    const statusIcon = statusDiv.querySelector('.status-icon');
    
    if (status.status === 'connected') {
        statusDiv.className = 'status-connected';
        statusText.textContent = '✓ Terhubung! Bot aktif';
        statusIcon.textContent = '🟢';
        document.getElementById('qrContainer').classList.add('hidden');
        document.getElementById('pairingContainer').classList.add('hidden');
    } else if (status.status === 'waiting_qr') {
        statusDiv.className = 'status-waiting';
        statusText.textContent = '⏳ Menunggu scan QR Code';
        statusIcon.textContent = '🟡';
    } else {
        statusDiv.className = 'status-disconnected';
        statusText.textContent = '❌ Belum terhubung';
        statusIcon.textContent = '🔴';
    }
}

function showSuccessMessage() {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `
        <div style="background: #d4edda; color: #155724; padding: 15px; border-radius: 8px; margin-top: 20px; text-align: center;">
            ✅ Bot berhasil terhubung! Sekarang Anda bisa menggunakan command #menu di WhatsApp
        </div>
    `;
    document.querySelector('.bot-commands').insertAdjacentElement('beforebegin', successDiv);
    
    setTimeout(() => successDiv.remove(), 5000);
}