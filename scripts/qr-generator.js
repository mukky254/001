// scripts/qr-generator.js - QR CODE GENERATION
const API_BASE_URL = 'https://zero0-1-r0xs.onrender.com';

document.addEventListener('DOMContentLoaded', async function() {
    await initializeQRGenerator();
    setupQREvents();
});

async function initializeQRGenerator() {
    // Check authentication
    const sessionData = localStorage.getItem('attendance_session');
    if (!sessionData) {
        window.location.href = 'login.html';
        return;
    }

    const session = JSON.parse(sessionData);
    const { user, token } = session;
    
    if (!user || (user.role !== 'lecturer' && user.role !== 'admin')) {
        window.location.href = 'dashboard.html';
        return;
    }

    // Set user info
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userRole').textContent = user.role === 'lecturer' ? 'Lecturer' : 'Admin';
    
    // Set avatar
    const avatarText = getInitials(user.name);
    document.getElementById('userAvatar').textContent = avatarText;
    document.getElementById('miniAvatar').textContent = avatarText;

    // Load recent QR codes
    await loadRecentQRCodes(user.id, token);
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

async function loadRecentQRCodes(userId, token) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/lecturers/${userId}/qr-codes`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load QR codes');
        }

        const data = await response.json();
        updateRecentQRCodesTable(data.qrCodes || []);
        
    } catch (error) {
        console.error('Error loading QR codes:', error);
        showAlert('Failed to load QR codes', 'error');
    }
}

function updateRecentQRCodesTable(qrCodes) {
    const tableBody = document.getElementById('recentQRCodesBody');
    if (!tableBody) return;

    if (!qrCodes.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">No QR codes generated yet</td>
            </tr>
        `;
        return;
    }

    const tableHTML = qrCodes.map(qr => {
        const isActive = new Date(qr.expiresAt) > new Date();
        const createdAt = new Date(qr.createdAt);
        
        return `
            <tr>
                <td>${qr.unitName || '-'}</td>
                <td>${qr.unitCode || '-'}</td>
                <td>${createdAt.toLocaleDateString()}</td>
                <td>
                    <span class="badge ${isActive ? 'bg-success' : 'bg-danger'}">
                        ${isActive ? 'Active' : 'Expired'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="viewQRCode('${qr.qrCodeId}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    tableBody.innerHTML = tableHTML;
}

function setupQREvents() {
    // QR generation form
    const qrForm = document.getElementById('qrGenerationForm');
    if (qrForm) {
        qrForm.addEventListener('submit', generateQRCode);
    }

    // Print QR code button
    const printQRBtn = document.getElementById('printQRBtn');
    if (printQRBtn) {
        printQRBtn.addEventListener('click', printQRCode);
    }

    // Download QR code button
    const downloadQRBtn = document.getElementById('downloadQRBtn');
    if (downloadQRBtn) {
        downloadQRBtn.addEventListener('click', downloadCurrentQRCode);
    }

    // Refresh list button
    const refreshListBtn = document.getElementById('refreshListBtn');
    if (refreshListBtn) {
        refreshListBtn.addEventListener('click', refreshQRCodeList);
    }
}

let currentQRCodeData = null;

async function generateQRCode(e) {
    e.preventDefault();
    
    const session = JSON.parse(localStorage.getItem('attendance_session'));
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    const unitName = document.getElementById('unitName').value;
    const unitCode = document.getElementById('unitCode').value;
    const duration = parseInt(document.getElementById('duration').value);
    const classType = document.getElementById('classType').value;
    const topic = document.getElementById('topic').value;
    const generateBtn = document.getElementById('generateBtn');

    // Validation
    if (!unitName || !unitCode || !duration) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }

    if (duration < 1 || duration > 240) {
        showAlert('Duration must be between 1 and 240 minutes', 'error');
        return;
    }

    // Show loading
    generateBtn.disabled = true;
    const originalText = generateBtn.innerHTML;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

    try {
        const response = await fetch(`${API_BASE_URL}/api/lecturers/generate-qr`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.token}`
            },
            body: JSON.stringify({
                unitName,
                unitCode,
                duration,
                classType,
                topic
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Store QR code data
            currentQRCodeData = data.qrCode;
            
            // Generate visual QR code
            generateQRCodeVisual(data.qrCode);
            
            // Show QR code display
            document.getElementById('qrDisplay').style.display = 'block';
            
            // Update QR code info
            updateQRCodeInfo(data.qrCode);
            
            // Scroll to display
            document.getElementById('qrDisplay').scrollIntoView({ behavior: 'smooth' });
            
            showAlert('✅ QR code generated successfully!', 'success');
            
            // Refresh QR codes list
            await refreshQRCodeList();
            
        } else {
            throw new Error(data.message || 'Failed to generate QR code');
        }
    } catch (error) {
        console.error('Error generating QR code:', error);
        showAlert('❌ ' + error.message, 'error');
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = originalText;
    }
}

function generateQRCodeVisual(qrData) {
    const qrcodeContainer = document.getElementById('qrcode');
    qrcodeContainer.innerHTML = '';

    // Generate QR code
    QRCode.toCanvas(qrcodeContainer, JSON.stringify(qrData), {
        width: 250,
        height: 250,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        }
    }, function(error) {
        if (error) {
            console.error('QR code generation error:', error);
            showAlert('Failed to generate QR code image', 'error');
        }
    });
}

function updateQRCodeInfo(qrData) {
    document.getElementById('qrUnitName').textContent = qrData.unitName;
    document.getElementById('qrUnitCode').textContent = qrData.unitCode;
    document.getElementById('qrClassType').textContent = qrData.classType || 'lecture';
    document.getElementById('qrTopic').textContent = qrData.topic || 'Not specified';
    document.getElementById('qrLecturer').textContent = qrData.lecturerName;
    document.getElementById('qrGenerated').textContent = new Date(qrData.createdAt).toLocaleString();
    document.getElementById('qrExpires').textContent = new Date(qrData.expiresAt).toLocaleString();
    document.getElementById('qrDuration').textContent = qrData.duration;
    document.getElementById('qrCodeId').textContent = qrData.qrCodeId;
}

function printQRCode() {
    if (!currentQRCodeData) {
        showAlert('No QR code to print', 'error');
        return;
    }

    const printWindow = window.open('', '_blank');
    const canvas = document.querySelector('#qrcode canvas');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>QR Code - ${currentQRCodeData.unitName}</title>
            <style>
                body { font-family: Arial; padding: 20px; text-align: center; }
                h1 { color: #333; margin-bottom: 20px; }
                .qr-info { text-align: left; max-width: 400px; margin: 20px auto; }
                .qr-code { margin: 20px auto; }
            </style>
        </head>
        <body>
            <h1>Attendance QR Code</h1>
            <div class="qr-info">
                <p><strong>Unit:</strong> ${currentQRCodeData.unitName}</p>
                <p><strong>Code:</strong> ${currentQRCodeData.unitCode}</p>
                <p><strong>Lecturer:</strong> ${currentQRCodeData.lecturerName}</p>
                <p><strong>Generated:</strong> ${new Date(currentQRCodeData.createdAt).toLocaleString()}</p>
                <p><strong>Duration:</strong> ${currentQRCodeData.duration} minutes</p>
            </div>
            <div class="qr-code">
                <img src="${canvas.toDataURL()}" width="300" height="300">
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
}

function downloadCurrentQRCode() {
    if (!currentQRCodeData) {
        showAlert('No QR code to download', 'error');
        return;
    }
    
    const canvas = document.querySelector('#qrcode canvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `QR_${currentQRCodeData.unitCode}_${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
    
    showAlert('QR code downloaded', 'success');
}

async function refreshQRCodeList() {
    const session = JSON.parse(localStorage.getItem('attendance_session'));
    if (!session) return;

    const refreshBtn = document.getElementById('refreshListBtn');
    const originalText = refreshBtn.innerHTML;
    
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';

    await loadRecentQRCodes(session.user.id, session.token);
    
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = originalText;
}

function viewQRCode(qrCodeId) {
    showAlert(`QR Code ID: ${qrCodeId}`, 'info');
}

// Make functions available globally
window.viewQRCode = viewQRCode;
window.refreshQRCodeList = refreshQRCodeList;
window.logout = function() {
    localStorage.removeItem('attendance_session');
    window.location.href = 'index.html';
};
