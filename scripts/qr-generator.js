// qr-generator.js - COMPLETE FIXED VERSION WITH WHATSAPP SHARING
document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = 'https://zero0-1-r0xs.onrender.com';
    let currentQRCode = null;
    
    // Check authentication
    checkAuth();
    
    // Generate QR Code
    document.getElementById('qrGenerationForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const unitName = document.getElementById('unitName').value;
        const unitCode = document.getElementById('unitCode').value;
        const duration = parseInt(document.getElementById('duration').value);
        const classType = document.getElementById('classType').value;
        const topic = document.getElementById('topic').value || "";
        
        // Get lecturer info
        const user = JSON.parse(localStorage.getItem('user'));
        const lecturerId = user?.id || "LT001";
        const lecturerName = user?.name || document.getElementById('userName').textContent || "Lecturer";
        
        // Generate QR Code ID
        const qrCodeId = 'QR_' + Math.random().toString(36).substr(2, 9).toUpperCase();
        const createdAt = new Date();
        const expiresAt = new Date(createdAt.getTime() + duration * 60000);
        
        // Create QR data
        const qrData = {
            qrCodeId: qrCodeId,
            unitName: unitName,
            unitCode: unitCode,
            classType: classType,
            topic: topic,
            lecturerId: lecturerId,
            lecturerName: lecturerName,
            duration: duration,
            createdAt: createdAt.toISOString(),
            expiresAt: expiresAt.toISOString(),
            isActive: true
        };
        
        // Show loading
        const generateBtn = document.getElementById('generateBtn');
        const originalText = generateBtn.innerHTML;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        generateBtn.disabled = true;
        
        try {
            // Generate QR Code image
            generateQRCodeImage(qrData);
            
            // Save to backend
            const savedQR = await saveQRToBackend(qrData);
            
            // Display QR info
            displayQRInfo(qrData);
            
            // Show QR display section
            document.getElementById('qrDisplay').style.display = 'block';
            
            // Save to localStorage
            saveQRToLocalStorage(qrData);
            
            // Update recent QR codes list
            loadRecentQRCodes();
            
            // Success message
            showNotification('QR code generated successfully!', 'success');
            
            // Enable WhatsApp sharing
            setupWhatsAppSharing(qrData);
            
        } catch (error) {
            console.error('Error generating QR:', error);
            showNotification('Failed to generate QR code. ' + error.message, 'error');
            
            // Fallback: Generate QR locally
            generateQRCodeImage(qrData);
            displayQRInfo(qrData);
            document.getElementById('qrDisplay').style.display = 'block';
            saveQRToLocalStorage(qrData);
            showNotification('QR code generated locally', 'warning');
        } finally {
            // Reset button
            generateBtn.innerHTML = originalText;
            generateBtn.disabled = false;
        }
    });
    
    // Generate QR Code Image
    function generateQRCodeImage(qrData) {
        const qrString = JSON.stringify(qrData);
        const qrcodeElement = document.getElementById('qrcode');
        
        // Clear previous QR code
        qrcodeElement.innerHTML = '';
        
        // Generate QR code
        QRCode.toCanvas(qrString, { 
            errorCorrectionLevel: 'H',
            width: 250,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            }
        }, function(err, canvas) {
            if (err) {
                console.error('QR Code generation error:', err);
                // Fallback to basic QR code
                qrcodeElement.innerHTML = `<div style="color: red; padding: 20px;">QR Code Error: ${err.message}</div>`;
                return;
            }
            
            // Add canvas to display
            canvas.style.border = '1px solid #ddd';
            canvas.style.borderRadius = '8px';
            canvas.style.padding = '10px';
            canvas.style.background = 'white';
            qrcodeElement.appendChild(canvas);
            
            // Store current QR code data URL for sharing
            currentQRCode = canvas.toDataURL('image/png');
            
            // Add download button functionality
            setupDownloadButton(canvas, qrData);
        });
    }
    
    // Setup download button
    function setupDownloadButton(canvas, qrData) {
        const downloadBtn = document.getElementById('downloadQRBtn');
        downloadBtn.onclick = function() {
            const link = document.createElement('a');
            link.download = `attendance-${qrData.unitCode}-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            showNotification('QR code downloaded!', 'success');
        };
    }
    
    // Setup WhatsApp sharing
    function setupWhatsAppSharing(qrData) {
        const whatsappBtn = document.getElementById('whatsappShareBtn');
        if (!whatsappBtn) {
            // Create WhatsApp share button if it doesn't exist
            const shareContainer = document.querySelector('.mt-4') || document.querySelector('.card-body .mt-4');
            if (shareContainer) {
                const newWhatsappBtn = document.createElement('button');
                newWhatsappBtn.id = 'whatsappShareBtn';
                newWhatsappBtn.className = 'btn btn-success';
                newWhatsappBtn.innerHTML = '<i class="fab fa-whatsapp"></i> Share via WhatsApp';
                shareContainer.appendChild(newWhatsappBtn);
                
                newWhatsappBtn.onclick = function() {
                    shareViaWhatsApp(qrData);
                };
            }
        } else {
            whatsappBtn.onclick = function() {
                shareViaWhatsApp(qrData);
            };
        }
    }
    
    // Share via WhatsApp
    function shareViaWhatsApp(qrData) {
        if (!currentQRCode) {
            showNotification('Please generate a QR code first', 'error');
            return;
        }
        
        // Convert data URL to blob
        fetch(currentQRCode)
            .then(res => res.blob())
            .then(blob => {
                // Create file for sharing
                const file = new File([blob], `attendance-qr-${qrData.unitCode}.png`, { type: 'image/png' });
                
                // Create message
                const message = `📚 *Class Attendance QR Code*\n\n` +
                              `*Unit:* ${qrData.unitName} (${qrData.unitCode})\n` +
                              `*Lecturer:* ${qrData.lecturerName}\n` +
                              `*Class Type:* ${qrData.classType}\n` +
                              `*Topic:* ${qrData.topic || 'Not specified'}\n` +
                              `*Valid Until:* ${new Date(qrData.expiresAt).toLocaleString()}\n\n` +
                              `Scan this QR code with the attendance app to mark your presence.`;
                
                // Create WhatsApp share URL
                const text = encodeURIComponent(message);
                const whatsappUrl = `https://wa.me/?text=${text}`;
                
                // Open WhatsApp in new tab
                window.open(whatsappUrl, '_blank');
                
                // For mobile devices, try to share via Web Share API
                if (navigator.share) {
                    navigator.share({
                        title: 'Attendance QR Code',
                        text: message,
                        files: [file]
                    }).then(() => {
                        console.log('Shared successfully');
                    }).catch(err => {
                        console.log('Error sharing:', err);
                    });
                }
            })
            .catch(err => {
                console.error('Error preparing share:', err);
                // Fallback to text-only share
                const message = `📚 *Class Attendance QR Code*\n\n` +
                              `*Unit:* ${qrData.unitName} (${qrData.unitCode})\n` +
                              `*Lecturer:* ${qrData.lecturerName}\n` +
                              `*Valid Until:* ${new Date(qrData.expiresAt).toLocaleString()}\n\n` +
                              `Scan with your attendance app!`;
                
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, '_blank');
            });
    }
    
    // Print QR Code
    document.getElementById('printQRBtn').addEventListener('click', function() {
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Attendance QR Code</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        padding: 30px;
                        max-width: 800px;
                        margin: 0 auto;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 2px solid #333;
                        padding-bottom: 20px;
                    }
                    .qr-container {
                        text-align: center;
                        margin: 30px 0;
                        padding: 20px;
                        border: 1px solid #ddd;
                        border-radius: 10px;
                        background: #f9f9f9;
                    }
                    .qr-code-img {
                        width: 300px;
                        height: 300px;
                        display: block;
                        margin: 0 auto 20px auto;
                    }
                    .info-container {
                        margin-top: 30px;
                        padding: 20px;
                        border: 1px solid #ddd;
                        border-radius: 10px;
                        background: #fff;
                    }
                    .info-row {
                        display: flex;
                        margin-bottom: 10px;
                        padding-bottom: 10px;
                        border-bottom: 1px solid #eee;
                    }
                    .info-label {
                        font-weight: bold;
                        width: 150px;
                        color: #333;
                    }
                    .info-value {
                        flex: 1;
                        color: #555;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        color: #666;
                        font-size: 12px;
                    }
                    @media print {
                        body { padding: 10px; }
                        .no-print { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📊 Attendance QR Code</h1>
                    <p>Generated: ${new Date().toLocaleString()}</p>
                </div>
                
                <div class="qr-container">
                    <h2>Scan this QR Code</h2>
                    <img src="${currentQRCode || ''}" class="qr-code-img" alt="QR Code">
                    <p><strong>QR Code ID:</strong> ${document.getElementById('qrCodeId').textContent}</p>
                </div>
                
                <div class="info-container">
                    <h2>📚 Class Information</h2>
                    <div class="info-row">
                        <div class="info-label">Unit:</div>
                        <div class="info-value">${document.getElementById('qrUnitName').textContent}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Code:</div>
                        <div class="info-value">${document.getElementById('qrUnitCode').textContent}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Class Type:</div>
                        <div class="info-value">${document.getElementById('qrClassType').textContent}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Topic:</div>
                        <div class="info-value">${document.getElementById('qrTopic').textContent}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Lecturer:</div>
                        <div class="info-value">${document.getElementById('qrLecturer').textContent}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Generated:</div>
                        <div class="info-value">${document.getElementById('qrGenerated').textContent}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Expires:</div>
                        <div class="info-value">${document.getElementById('qrExpires').textContent}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Duration:</div>
                        <div class="info-value">${document.getElementById('qrDuration').textContent} minutes</div>
                    </div>
                </div>
                
                <div class="footer">
                    <p>Generated by IN Attendance System | ${new Date().getFullYear()}</p>
                </div>
                
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(() => window.close(), 1000);
                    }
                </script>
            </body>
            </html>
        `;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(printContent);
        printWindow.document.close();
    });
    
    // Load recent QR codes
    document.getElementById('refreshListBtn').addEventListener('click', loadRecentQRCodes);
    
    // Initial load
    loadRecentQRCodes();
    
    // Functions
    function displayQRInfo(qrData) {
        document.getElementById('qrUnitName').textContent = qrData.unitName;
        document.getElementById('qrUnitCode').textContent = qrData.unitCode;
        document.getElementById('qrClassType').textContent = qrData.classType;
        document.getElementById('qrTopic').textContent = qrData.topic || 'Not specified';
        document.getElementById('qrLecturer').textContent = qrData.lecturerName;
        document.getElementById('qrGenerated').textContent = new Date(qrData.createdAt).toLocaleString();
        document.getElementById('qrExpires').textContent = new Date(qrData.expiresAt).toLocaleString();
        document.getElementById('qrDuration').textContent = qrData.duration;
        document.getElementById('qrCodeId').textContent = qrData.qrCodeId;
    }
    
    async function saveQRToBackend(qrData) {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }
            
            const response = await fetch(`${API_BASE_URL}/api/lecturers/generate-qr`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    unitName: qrData.unitName,
                    unitCode: qrData.unitCode,
                    duration: qrData.duration,
                    classType: qrData.classType,
                    topic: qrData.topic
                })
            });
            
            const responseData = await response.json();
            
            if (!response.ok) {
                throw new Error(responseData.message || 'Failed to save QR code');
            }
            
            return responseData.qrCode || qrData;
            
        } catch (error) {
            console.error('Error saving QR to backend:', error);
            throw error;
        }
    }
    
    function saveQRToLocalStorage(qrData) {
        let recentQRCodes = JSON.parse(localStorage.getItem('recentQRCodes')) || [];
        recentQRCodes.unshift(qrData);
        
        if (recentQRCodes.length > 10) {
            recentQRCodes = recentQRCodes.slice(0, 10);
        }
        
        localStorage.setItem('recentQRCodes', JSON.stringify(recentQRCodes));
    }
    
    async function loadRecentQRCodes() {
        try {
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user'));
            
            if (!token || !user) {
                throw new Error('Not authenticated');
            }
            
            const response = await fetch(`${API_BASE_URL}/api/lecturers/${user.id}/qr-codes`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                displayRecentQRCodes(data.qrCodes || []);
            } else {
                const recentQRCodes = JSON.parse(localStorage.getItem('recentQRCodes')) || [];
                displayRecentQRCodes(recentQRCodes);
            }
        } catch (error) {
            console.error('Error loading recent QR codes:', error);
            const recentQRCodes = JSON.parse(localStorage.getItem('recentQRCodes')) || [];
            displayRecentQRCodes(recentQRCodes);
        }
    }
    
    function displayRecentQRCodes(qrCodes) {
        const tbody = document.getElementById('recentQRCodesBody');
        
        tbody.innerHTML = '';
        
        if (!qrCodes || qrCodes.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted">
                        No QR codes generated yet
                    </td>
                </tr>
            `;
            return;
        }
        
        qrCodes.forEach(qr => {
            const row = document.createElement('tr');
            const expiryDate = new Date(qr.expiresAt || qr.expiryTime);
            const now = new Date();
            const isExpired = now > expiryDate;
            const isActive = qr.isActive && !isExpired;
            
            const status = isActive ? 
                '<span class="status-badge active">Active</span>' : 
                '<span class="status-badge expired">Expired</span>';
            
            row.innerHTML = `
                <td>${qr.unitName}</td>
                <td>${qr.unitCode}</td>
                <td>${new Date(qr.createdAt).toLocaleDateString()}</td>
                <td>${status}</td>
                <td>
                    <button class="btn btn-sm btn-info view-qr-btn" data-id="${qr.qrCodeId}">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        // Add event listeners
        document.querySelectorAll('.view-qr-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const qrId = this.dataset.id;
                const qr = qrCodes.find(q => q.qrCodeId === qrId);
                if (qr) {
                    let qrData;
                    try {
                        qrData = typeof qr.qrData === 'string' ? JSON.parse(qr.qrData) : qr;
                    } catch (e) {
                        qrData = qr;
                    }
                    
                    generateQRCodeImage(qrData);
                    displayQRInfo(qrData);
                    document.getElementById('qrDisplay').style.display = 'block';
                    document.getElementById('qrDisplay').scrollIntoView({ behavior: 'smooth' });
                    setupWhatsAppSharing(qrData);
                }
            });
        });
    }
    
    function showNotification(message, type) {
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    function checkAuth() {
        const user = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (!user || !token) {
            window.location.href = 'login.html';
            return;
        }
        
        try {
            const userData = JSON.parse(user);
            document.getElementById('userName').textContent = userData.name || 'Lecturer';
            document.getElementById('userAvatar').textContent = getInitials(userData.name);
            document.getElementById('miniAvatar').textContent = getInitials(userData.name);
            document.getElementById('userRole').textContent = userData.role || 'Lecturer';
        } catch (error) {
            console.error('Error parsing user data:', error);
            window.location.href = 'login.html';
        }
    }
    
    function getInitials(name) {
        return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'JD';
    }
});
