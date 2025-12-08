// qr-generator.js - UPDATED FOR YOUR SERVER ENDPOINTS
document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = 'https://zero0-1-r0xs.onrender.com';
    
    // Initialize QRCode instance
    const qrcode = new QRCode(document.getElementById("qrcode"), {
        text: "Waiting for data...",
        width: 250,
        height: 250,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

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
        
        // Get lecturer info from localStorage
        const user = JSON.parse(localStorage.getItem('user'));
        const lecturerId = user?.id || "LT001";
        const lecturerName = user?.name || document.getElementById('userName').textContent || "Lecturer";
        
        // Generate unique QR Code ID
        const qrCodeId = generateQRCodeId();
        const createdAt = new Date();
        const expiresAt = new Date(createdAt.getTime() + duration * 60000);
        
        // Create QR data object
        const qrDataObject = {
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
        
        // Stringify for QR code image
        const qrDataString = JSON.stringify(qrDataObject);
        
        // Show loading
        const generateBtn = document.getElementById('generateBtn');
        const originalText = generateBtn.innerHTML;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        generateBtn.disabled = true;
        
        try {
            // Get JWT token from localStorage
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found. Please login again.');
            }
            
            // Generate QR Code image
            qrcode.makeCode(qrDataString);
            
            // Send to backend - Use YOUR ACTUAL ENDPOINT
            const response = await fetch(`${API_BASE_URL}/api/lecturers/generate-qr`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    unitName: unitName,
                    unitCode: unitCode,
                    duration: duration,
                    classType: classType,
                    topic: topic
                })
            });
            
            const responseData = await response.json();
            
            if (!response.ok) {
                throw new Error(responseData.message || 'Failed to generate QR code');
            }
            
            console.log('QR Code generated:', responseData);
            
            // Display QR info
            displayQRInfo(qrDataObject);
            
            // Show QR display section
            document.getElementById('qrDisplay').style.display = 'block';
            
            // Save to localStorage for recent QR codes
            saveQRToLocalStorage(qrDataObject);
            
            // Update recent QR codes list
            loadRecentQRCodes();
            
            // Success message
            showNotification('QR code generated successfully!', 'success');
            
        } catch (error) {
            console.error('Error generating QR:', error);
            showNotification('Failed to generate QR code: ' + error.message, 'error');
            
            // Fallback: Save locally if backend fails
            const qrDataObject = {
                qrCodeId: qrCodeId,
                unitName: unitName,
                unitCode: unitCode,
                classType: classType,
                topic: topic,
                lecturerId: lecturerId,
                lecturerName: lecturerName,
                duration: duration,
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + duration * 60000).toISOString(),
                isActive: true
            };
            
            qrcode.makeCode(JSON.stringify(qrDataObject));
            displayQRInfo(qrDataObject);
            document.getElementById('qrDisplay').style.display = 'block';
            saveQRToLocalStorage(qrDataObject);
            loadRecentQRCodes();
            
            showNotification('QR code generated locally (backend unreachable)', 'warning');
        } finally {
            // Reset button
            generateBtn.innerHTML = originalText;
            generateBtn.disabled = false;
        }
    });
    
    // Download QR Code
    document.getElementById('downloadQRBtn').addEventListener('click', function() {
        const canvas = document.querySelector("#qrcode canvas");
        if (canvas) {
            const link = document.createElement('a');
            link.download = `attendance-${document.getElementById('qrUnitCode').textContent}-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }
    });
    
    // Print QR Code
    document.getElementById('printQRBtn').addEventListener('click', function() {
        const printWindow = window.open('', '_blank');
        const qrContent = `
            <html>
            <head>
                <title>Attendance QR Code</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .qr-container { text-align: center; margin: 20px 0; }
                    .qr-info { text-align: left; margin-top: 20px; border: 1px solid #ccc; padding: 15px; border-radius: 5px; }
                    .qr-info h3 { color: #333; margin-top: 0; }
                    .qr-info p { margin: 8px 0; }
                    .qr-code-img { width: 300px; height: 300px; }
                </style>
            </head>
            <body>
                <h2>📊 Attendance QR Code</h2>
                <div class="qr-container">
                    <img src="${document.querySelector('#qrcode img').src}" class="qr-code-img">
                </div>
                <div class="qr-info">
                    <h3>📚 Class Information</h3>
                    <p><strong>Unit:</strong> ${document.getElementById('qrUnitName').textContent}</p>
                    <p><strong>Code:</strong> ${document.getElementById('qrUnitCode').textContent}</p>
                    <p><strong>Class Type:</strong> ${document.getElementById('qrClassType').textContent}</p>
                    <p><strong>Topic:</strong> ${document.getElementById('qrTopic').textContent}</p>
                    <p><strong>Lecturer:</strong> ${document.getElementById('qrLecturer').textContent}</p>
                    <p><strong>Generated:</strong> ${document.getElementById('qrGenerated').textContent}</p>
                    <p><strong>Expires:</strong> ${document.getElementById('qrExpires').textContent}</p>
                    <p><strong>Duration:</strong> ${document.getElementById('qrDuration').textContent} minutes</p>
                    <p><strong>QR Code ID:</strong> ${document.getElementById('qrCodeId').textContent}</p>
                </div>
                <script>window.onload = () => { window.print(); window.close(); }</script>
            </body>
            </html>
        `;
        
        printWindow.document.write(qrContent);
        printWindow.document.close();
    });
    
    // Load recent QR codes
    document.getElementById('refreshListBtn').addEventListener('click', loadRecentQRCodes);
    
    // Initial load
    loadRecentQRCodes();
    
    // Functions
    function generateQRCodeId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = 'QR_';
        for (let i = 0; i < 10; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
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
    
    function saveQRToLocalStorage(qrData) {
        let recentQRCodes = JSON.parse(localStorage.getItem('recentQRCodes')) || [];
        recentQRCodes.unshift(qrData);
        
        // Keep only last 10
        if (recentQRCodes.length > 10) {
            recentQRCodes = recentQRCodes.slice(0, 10);
        }
        
        localStorage.setItem('recentQRCodes', JSON.stringify(recentQRCodes));
    }
    
    async function loadRecentQRCodes() {
        try {
            // Get token from localStorage
            const token = localStorage.getItem('token');
            const user = JSON.parse(localStorage.getItem('user'));
            
            if (!token || !user) {
                throw new Error('Not authenticated');
            }
            
            // Use YOUR ENDPOINT: /api/lecturers/:id/qr-codes
            const response = await fetch(`${API_BASE_URL}/api/lecturers/${user.id}/qr-codes`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                displayRecentQRCodes(data.qrCodes || []);
            } else {
                // Fallback to localStorage
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
        
        // Add event listeners to buttons
        document.querySelectorAll('.view-qr-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const qrId = this.dataset.id;
                const qr = qrCodes.find(q => q.qrCodeId === qrId);
                if (qr) {
                    // Parse qrData string if needed
                    let qrData;
                    try {
                        qrData = typeof qr.qrData === 'string' ? JSON.parse(qr.qrData) : qr;
                    } catch (e) {
                        qrData = qr;
                    }
                    
                    qrcode.makeCode(JSON.stringify(qrData));
                    displayQRInfo(qrData);
                    document.getElementById('qrDisplay').style.display = 'block';
                    document.getElementById('qrDisplay').scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }
    
    function showNotification(message, type) {
        // Remove existing notifications
        document.querySelectorAll('.notification').forEach(n => n.remove());
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    function checkAuth() {
        const user = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (!user || !token) {
            // Redirect to login
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
