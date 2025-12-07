const API_BASE_URL = 'https://zero0-1-r0xs.onrender.com';

// Add QR code generation library fallback
function loadQRGenerator() {
    return new Promise((resolve, reject) => {
        if (window.QRCode) {
            resolve();
            return;
        }
        
        // Load QRCode library dynamically
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load QR generator'));
        document.head.appendChild(script);
    });
}// QR Generator JavaScript
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

    // Load recent QR codes
    await loadRecentQRCodes(user.id, token, user.role);
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

async function loadRecentQRCodes(userId, token, role) {
    try {
        let response;
        
        if (role === 'lecturer') {
            response = await fetch(`${API_BASE_URL}/api/lecturers/${userId}/qr-codes`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } else if (role === 'admin') {
            // Admins can see all QR codes
            response = await fetch(`${API_BASE_URL}/api/admin/qr-codes`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        }

        if (!response || !response.ok) {
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
                <td colspan="7" class="text-center">No QR codes generated yet</td>
            </tr>
        `;
        return;
    }

    const tableHTML = qrCodes.map(qr => {
        const isActive = new Date(qr.expiresAt) > new Date();
        const createdAt = new Date(qr.createdAt);
        const expiresAt = new Date(qr.expiresAt);
        
        return `
            <tr>
                <td>${qr.unitName || '-'}</td>
                <td>${qr.unitCode || '-'}</td>
                <td>${qr.classType || 'lecture'}</td>
                <td>${createdAt.toLocaleDateString()} ${createdAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                <td>${expiresAt.toLocaleDateString()} ${expiresAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                <td>${qr.attendanceCount || 0}</td>
                <td>
                    <span class="status-badge ${isActive ? 'status-present' : 'status-absent'}">
                        ${isActive ? 'Active' : 'Expired'}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-outline" onclick="viewQRCode('${qr.qrCodeId}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="downloadQRCode('${qr.qrCodeId}')">
                            <i class="fas fa-download"></i>
                        </button>
                        ${isActive ? `
                            <button class="btn btn-sm btn-danger" onclick="deactivateQRCode('${qr.qrCodeId}')">
                                <i class="fas fa-stop"></i>
                            </button>
                        ` : ''}
                    </div>
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

    // Share QR code button
    const shareQRBtn = document.getElementById('shareQRBtn');
    if (shareQRBtn) {
        shareQRBtn.addEventListener('click', shareQRCode);
    }

    // Refresh list button
    const refreshListBtn = document.getElementById('refreshListBtn');
    if (refreshListBtn) {
        refreshListBtn.addEventListener('click', refreshQRCodeList);
    }

    // Quick generate buttons
    document.querySelectorAll('.quick-duration').forEach(btn => {
        btn.addEventListener('click', function() {
            const duration = this.dataset.duration;
            document.getElementById('duration').value = duration;
        });
    });
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

    if (duration < 1 || duration > 120) {
        showAlert('Duration must be between 1 and 120 minutes', 'error');
        return;
    }

    // Show loading
    generateBtn.disabled = true;
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
            
            showAlert('QR code generated successfully!', 'success');
            
            // Refresh QR codes list
            await refreshQRCodeList();
            
        } else {
            throw new Error(data.message || 'Failed to generate QR code');
        }
    } catch (error) {
        console.error('Error generating QR code:', error);
        showAlert(error.message, 'error');
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-qrcode"></i> Generate QR Code';
    }
}

function generateQRCodeVisual(qrData) {
    const qrcodeContainer = document.getElementById('qrcode');
    qrcodeContainer.innerHTML = '';

    // Generate QR code using qrcode.js
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
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    text-align: center;
                }
                h1 {
                    color: #333;
                    margin-bottom: 20px;
                }
                .qr-info {
                    text-align: left;
                    max-width: 400px;
                    margin: 20px auto;
                    padding: 20px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                }
                .qr-info p {
                    margin: 8px 0;
                }
                .qr-code {
                    margin: 20px auto;
                }
                .footer {
                    margin-top: 30px;
                    color: #666;
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            <h1>Attendance QR Code</h1>
            <div class="qr-info">
                <p><strong>Unit:</strong> ${currentQRCodeData.unitName}</p>
                <p><strong>Code:</strong> ${currentQRCodeData.unitCode}</p>
                <p><strong>Class Type:</strong> ${currentQRCodeData.classType}</p>
                <p><strong>Topic:</strong> ${currentQRCodeData.topic || 'Not specified'}</p>
                <p><strong>Lecturer:</strong> ${currentQRCodeData.lecturerName}</p>
                <p><strong>Generated:</strong> ${new Date(currentQRCodeData.createdAt).toLocaleString()}</p>
                <p><strong>Expires:</strong> ${new Date(currentQRCodeData.expiresAt).toLocaleString()}</p>
                <p><strong>Duration:</strong> ${currentQRCodeData.duration} minutes</p>
                <p><strong>QR Code ID:</strong> ${currentQRCodeData.qrCodeId}</p>
            </div>
            <div class="qr-code">
                <img src="${canvas.toDataURL()}" width="300" height="300">
            </div>
            <div class="footer">
                <p>Scan this QR code to mark attendance</p>
                <p>IN Attendance System</p>
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
    
    downloadQRCode(currentQRCodeData.qrCodeId);
}

async function downloadQRCode(qrCodeId) {
    const canvas = document.querySelector('#qrcode canvas');
    if (!canvas) {
        showAlert('No QR code available for download', 'error');
        return;
    }

    const link = document.createElement('a');
    link.download = `QR_${currentQRCodeData.unitCode}_${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
    
    showAlert('QR code downloaded successfully', 'success');
}

async function shareQRCode() {
    if (!currentQRCodeData) {
        showAlert('No QR code to share', 'error');
        return;
    }

    if (navigator.share) {
        try {
            const canvas = document.querySelector('#qrcode canvas');
            const blob = await new Promise(resolve => canvas.toBlob(resolve));
            const file = new File([blob], `QR_${currentQRCodeData.unitCode}.png`, { type: 'image/png' });
            
            await navigator.share({
                title: `QR Code for ${currentQRCodeData.unitName}`,
                text: `Scan this QR code to mark attendance for ${currentQRCodeData.unitName}`,
                files: [file]
            });
            
            showAlert('QR code shared successfully', 'success');
        } catch (error) {
            if (error.name !== 'AbortError') {
                showAlert('Failed to share QR code', 'error');
            }
        }
    } else {
        // Fallback: copy to clipboard
        const text = `QR Code for ${currentQRCodeData.unitName} (${currentQRCodeData.unitCode})\nGenerated: ${new Date().toLocaleString()}\nID: ${currentQRCodeData.qrCodeId}`;
        
        try {
            await navigator.clipboard.writeText(text);
            showAlert('QR code info copied to clipboard', 'success');
        } catch (error) {
            showAlert('Failed to copy QR code info', 'error');
        }
    }
}

async function refreshQRCodeList() {
    const session = JSON.parse(localStorage.getItem('attendance_session'));
    if (!session) return;

    const refreshBtn = document.getElementById('refreshListBtn');
    const originalHTML = refreshBtn.innerHTML;
    
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';

    await loadRecentQRCodes(session.user.id, session.token, session.user.role);
    
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = originalHTML;
}

async function viewQRCode(qrCodeId) {
    const session = JSON.parse(localStorage.getItem('attendance_session'));
    if (!session) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/lecturers/qr-codes/${qrCodeId}/attendance`, {
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            
            // Show attendance modal
            showAttendanceModal(data);
        } else {
            throw new Error('Failed to load QR code details');
        }
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

async function deactivateQRCode(qrCodeId) {
    if (!confirm('Are you sure you want to deactivate this QR code? This cannot be undone.')) {
        return;
    }

    const session = JSON.parse(localStorage.getItem('attendance_session'));
    if (!session) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/lecturers/qr-codes/${qrCodeId}/deactivate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.token}`
            }
        });

        if (response.ok) {
            showAlert('QR code deactivated successfully', 'success');
            await refreshQRCodeList();
        } else {
            throw new Error('Failed to deactivate QR code');
        }
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

function showAttendanceModal(data) {
    const modal = document.getElementById('attendanceModal');
    const modalBody = document.getElementById('attendanceModalBody');
    
    if (!modal || !modalBody) return;

    const attendanceHTML = `
        <h4>${data.qrCode.unitName} (${data.qrCode.unitCode})</h4>
        <p>Generated: ${new Date(data.qrCode.createdAt).toLocaleString()}</p>
        <p>Expires: ${new Date(data.qrCode.expiresAt).toLocaleString()}</p>
        
        <h5 class="mt-4">Attendance (${data.attendance.length} students):</h5>
        ${data.attendance.length > 0 ? `
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Student ID</th>
                            <th>Name</th>
                            <th>Scan Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.attendance.map(record => `
                            <tr>
                                <td>${record.studentId}</td>
                                <td>${record.studentName}</td>
                                <td>${new Date(record.scanTime).toLocaleTimeString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        ` : `
            <p class="text-center">No attendance recorded yet</p>
        `}
    `;

    modalBody.innerHTML = attendanceHTML;
    modal.classList.add('active');
}

function closeAttendanceModal() {
    const modal = document.getElementById('attendanceModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function showAlert(message, type = 'info') {
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    // Add to body
    document.body.appendChild(alert);

    // Position it
    alert.style.position = 'fixed';
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '9999';
    alert.style.maxWidth = '300px';

    // Remove after 5 seconds
    setTimeout(() => {
        alert.style.opacity = '0';
        alert.style.transform = 'translateX(100%)';
        setTimeout(() => {
            alert.remove();
        }, 300);
    }, 5000);

    // Click to dismiss
    alert.addEventListener('click', () => {
        alert.style.opacity = '0';
        alert.style.transform = 'translateX(100%)';
        setTimeout(() => {
            alert.remove();
        }, 300);
    });
}

// Make functions available globally
window.viewQRCode = viewQRCode;
window.downloadQRCode = downloadQRCode;
window.deactivateQRCode = deactivateQRCode;
window.closeAttendanceModal = closeAttendanceModal;
window.logout = function() {
    localStorage.removeItem('attendance_session');
    window.location.href = 'index.html';
};
