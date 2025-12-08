// scripts/qr-generator.js - QR CODE GENERATION
const API_BASE_URL = 'https://zero0-1-r0xs.onrender.com';
// qr-generator.js
document.addEventListener('DOMContentLoaded', function() {
    // Initialize QRCode instance
    const qrcode = new QRCode(document.getElementById("qrcode"), {
        text: "Waiting for data...",
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    // Generate QR Code
    document.getElementById('qrGenerationForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const unitName = document.getElementById('unitName').value;
        const unitCode = document.getElementById('unitCode').value;
        const duration = parseInt(document.getElementById('duration').value);
        const classType = document.getElementById('classType').value;
        const topic = document.getElementById('topic').value || "Not specified";
        const lecturerName = document.getElementById('userName').textContent || "Lecturer";
        
        // Generate unique ID
        const qrId = generateQRId();
        const generatedTime = new Date();
        const expiryTime = new Date(generatedTime.getTime() + duration * 60000);
        
        // Create QR data object
        const qrData = {
            id: qrId,
            unitName: unitName,
            unitCode: unitCode,
            classType: classType,
            topic: topic,
            lecturer: lecturerName,
            generated: generatedTime.toISOString(),
            expires: expiryTime.toISOString(),
            duration: duration,
            type: "attendance"
        };
        
        // Generate QR Code
        const qrString = JSON.stringify(qrData);
        qrcode.makeCode(qrString);
        
        // Save to localStorage for recent QR codes
        saveQRToLocalStorage(qrData);
        
        // Display QR info
        displayQRInfo(qrData);
        
        // Show QR display section
        document.getElementById('qrDisplay').style.display = 'block';
        
        // Save to MongoDB (using your connection)
        saveToMongoDB(qrData);
        
        // Update recent QR codes list
        loadRecentQRCodes();
    });
    
    // Download QR Code
    document.getElementById('downloadQRBtn').addEventListener('click', function() {
        const canvas = document.querySelector("#qrcode canvas");
        if (canvas) {
            const link = document.createElement('a');
            link.download = `attendance-qr-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        }
    });
    
    // Print QR Code
    document.getElementById('printQRBtn').addEventListener('click', function() {
        const printContent = document.getElementById('qrDisplay').innerHTML;
        const originalContent = document.body.innerHTML;
        
        document.body.innerHTML = printContent;
        window.print();
        document.body.innerHTML = originalContent;
        location.reload(); // Reload to restore functionality
    });
    
    // Load recent QR codes
    document.getElementById('refreshListBtn').addEventListener('click', loadRecentQRCodes);
    
    // Initial load
    loadRecentQRCodes();
    
    // Functions
    function generateQRId() {
        return 'QR' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
    }
    
    function displayQRInfo(qrData) {
        document.getElementById('qrUnitName').textContent = qrData.unitName;
        document.getElementById('qrUnitCode').textContent = qrData.unitCode;
        document.getElementById('qrClassType').textContent = qrData.classType;
        document.getElementById('qrTopic').textContent = qrData.topic;
        document.getElementById('qrLecturer').textContent = qrData.lecturer;
        document.getElementById('qrGenerated').textContent = new Date(qrData.generated).toLocaleString();
        document.getElementById('qrExpires').textContent = new Date(qrData.expires).toLocaleString();
        document.getElementById('qrDuration').textContent = qrData.duration;
        document.getElementById('qrCodeId').textContent = qrData.id;
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
    
    function loadRecentQRCodes() {
        const recentQRCodes = JSON.parse(localStorage.getItem('recentQRCodes')) || [];
        const tbody = document.getElementById('recentQRCodesBody');
        
        tbody.innerHTML = '';
        
        recentQRCodes.forEach(qr => {
            const row = document.createElement('tr');
            const expiryDate = new Date(qr.expires);
            const now = new Date();
            const status = now > expiryDate ? '<span class="status-badge expired">Expired</span>' : 
                          '<span class="status-badge active">Active</span>';
            
            row.innerHTML = `
                <td>${qr.unitName}</td>
                <td>${qr.unitCode}</td>
                <td>${new Date(qr.generated).toLocaleDateString()}</td>
                <td>${status}</td>
                <td>
                    <button class="btn-view-qr" data-id="${qr.id}">View</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    async function saveToMongoDB(qrData) {
        try {
            // Replace with your actual MongoDB endpoint
            const response = await fetch('https://your-backend-api.com/api/qrcodes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(qrData)
            });
            
            if (response.ok) {
                console.log('QR code saved to MongoDB');
            }
        } catch (error) {
            console.error('Error saving to MongoDB:', error);
        }
    }
});
