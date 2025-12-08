// qr-generator.js - WITH VISUAL QR CODE DISPLAY
document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = 'https://zero0-1-r0xs.onrender.com';
    
    // DOM Elements
    const qrCodeContainer = document.getElementById('qrcode');
    const qrImageDisplay = document.createElement('div');
    qrImageDisplay.id = 'qrImageDisplay';
    qrImageDisplay.style.display = 'none';
    qrCodeContainer.parentNode.insertBefore(qrImageDisplay, qrCodeContainer.nextSibling);
    
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
        const lecturerId = user?.id || "ID1";
        const lecturerName = user?.name || document.getElementById('userName').textContent || "Lecturer";
        
        // Generate unique ID
        const qrCodeId = 'QR_' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();
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
        
        // Stringify for QR code
        const qrDataString = JSON.stringify(qrDataObject);
        
        // Create data for MongoDB
        const mongoData = {
            qrCodeId: qrCodeId,
            unitName: unitName,
            unitCode: unitCode,
            classType: classType,
            topic: topic,
            lecturerId: lecturerId,
            lecturerName: lecturerName,
            duration: duration,
            createdAt: createdAt,
            expiresAt: expiresAt,
            isActive: true,
            qrData: qrDataString
        };
        
        // Show loading
        const generateBtn = document.getElementById('generateBtn');
        const originalText = generateBtn.innerHTML;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        generateBtn.disabled = true;
        
        try {
            // Save to backend first
            const savedQR = await saveQRToBackend(mongoData);
            console.log('QR saved to backend:', savedQR);
            
            // Generate QR code image
            await generateQRCodeImage(qrDataString, qrCodeId);
            
            // Display QR info
            displayQRInfo(qrDataObject);
            
            // Show QR display section
            document.getElementById('qrDisplay').style.display = 'block';
            
            // Save to localStorage
            saveQRToLocalStorage(qrDataObject);
            
            // Update recent QR codes list
            loadRecentQRCodes();
            
            // Success message
            showNotification('✅ QR code generated successfully!', 'success');
            
        } catch (error) {
            console.error('Error generating QR:', error);
            showNotification('❌ Failed to generate QR code: ' + error.message, 'error');
        } finally {
            // Reset button
            generateBtn.innerHTML = originalText;
            generateBtn.disabled = false;
        }
    });
    
    // Download QR Code
    document.getElementById('downloadQRBtn').addEventListener('click', function() {
        const qrImage = document.getElementById('generatedQRImage');
        if (qrImage && qrImage.src) {
            const link = document.createElement('a');
            link.download = `attendance-${document.getElementById('qrUnitCode').textContent}-${Date.now()}.png`;
            link.href = qrImage.src;
            link.click();
        } else {
            // Fallback: download from canvas
            const canvas = document.querySelector("#qrcode canvas");
            if (canvas) {
                const link = document.createElement('a');
                link.download = `attendance-${document.getElementById('qrUnitCode').textContent}-${Date.now()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
        }
    });
    
    // Print QR Code
    document.getElementById('printQRBtn').addEventListener('click', function() {
        printQRCode();
    });
    
    // Load recent QR codes
    document.getElementById('refreshListBtn').addEventListener('click', loadRecentQRCodes);
    
    // Initial load
    loadRecentQRCodes();
    
    // Functions
    async function generateQRCodeImage(qrData, qrCodeId) {
        return new Promise((resolve, reject) => {
            try {
                // Clear previous QR code
                qrCodeContainer.innerHTML = '';
                
                // Generate QR code using QRCode.js
                const qrcode = new QRCode(qrCodeContainer, {
                    text: qrData,
                    width: 300,
                    height: 300,
                    colorDark: "#000000",
                    colorLight: "#FFFFFF",
                    correctLevel: QRCode.CorrectLevel.H
                });
                
                // Wait for QR code to render
                setTimeout(() => {
                    // Get the canvas element
                    const canvas = qrCodeContainer.querySelector('canvas');
                    if (canvas) {
                        // Convert canvas to image
                        const qrImageUrl = canvas.toDataURL('image/png');
                        
                        // Create and display image
                        qrImageDisplay.innerHTML = `
                            <div class="qr-image-container">
                                <h4 class="text-center mb-3">Scan this QR Code</h4>
                                <img src="${qrImageUrl}" 
                                     alt="Attendance QR Code" 
                                     id="generatedQRImage"
                                     class="qr-code-image"
                                     style="width: 300px; height: 300px; border: 1px solid #ddd; padding: 10px; background: white;">
                                <div class="qr-actions mt-3">
                                    <button class="btn btn-sm btn-outline" onclick="copyQRImageURL()">
                                        <i class="fas fa-copy"></i> Copy Image URL
                                    </button>
                                    <button class="btn btn-sm btn-outline" onclick="shareQRCode()">
                                        <i class="fas fa-share"></i> Share
                                    </button>
                                </div>
                                <div class="qr-note mt-2">
                                    <small class="text-muted">Display this QR code for students to scan</small>
                                </div>
                            </div>
                        `;
                        qrImageDisplay.style.display = 'block';
                        
                        // Add some styles
                        if (!document.querySelector('#qr-styles')) {
                            const style = document.createElement('style');
                            style.id = 'qr-styles';
                            style.textContent = `
                                .qr-image-container {
                                    text-align: center;
                                    padding: 20px;
                                    background: #f8f9fa;
                                    border-radius: 10px;
                                    margin-bottom: 20px;
                                }
                                .qr-code-image {
                                    max-width: 100%;
                                    height: auto;
                                    cursor: pointer;
                                    transition: transform 0.3s ease;
                                }
                                .qr-code-image:hover {
                                    transform: scale(1.02);
                                }
                                .qr-actions {
                                    display: flex;
                                    gap: 10px;
                                    justify-content: center;
                                }
                                .qr-note {
                                    font-size: 12px;
                                }
                                .qr-fullscreen {
                                    position: fixed;
                                    top: 0;
                                    left: 0;
                                    width: 100%;
                                    height: 100%;
                                    background: rgba(0,0,0,0.9);
                                    display: flex;
                                    flex-direction: column;
                                    justify-content: center;
                                    align-items: center;
                                    z-index: 9999;
                                }
                                .qr-fullscreen img {
                                    max-width: 90%;
                                    max-height: 80%;
                                    border: 2px solid white;
                                    border-radius: 10px;
                                }
                                .qr-fullscreen .close-btn {
                                    position: absolute;
                                    top: 20px;
                                    right: 20px;
                                    background: white;
                                    border: none;
                                    width: 40px;
                                    height: 40px;
                                    border-radius: 50%;
                                    font-size: 20px;
                                    cursor: pointer;
                                }
                            `;
                            document.head.appendChild(style);
                        }
                        
                        // Make QR image clickable for fullscreen
                        setTimeout(() => {
                            const qrImage = document.getElementById('generatedQRImage');
                            if (qrImage) {
                                qrImage.addEventListener('click', showFullscreenQR);
                            }
                        }, 100);
                        
                        resolve(qrImageUrl);
                    } else {
                        reject(new Error('Canvas not found'));
                    }
                }, 500);
            } catch (error) {
                reject(error);
            }
        });
    }
    
    // Display QR in fullscreen
    window.showFullscreenQR = function() {
        const qrImage = document.getElementById('generatedQRImage');
        if (qrImage) {
            const fullscreenDiv = document.createElement('div');
            fullscreenDiv.className = 'qr-fullscreen';
            fullscreenDiv.innerHTML = `
                <button class="close-btn" onclick="this.parentElement.remove()">×</button>
                <img src="${qrImage.src}" alt="QR Code">
                <div class="mt-3 text-white">
                    <p>Display this QR code for students to scan</p>
                    <small>Press ESC or click X to close</small>
                </div>
            `;
            document.body.appendChild(fullscreenDiv);
            
            // Close on ESC key
            document.addEventListener('keydown', function closeOnEsc(e) {
                if (e.key === 'Escape') {
                    fullscreenDiv.remove();
                    document.removeEventListener('keydown', closeOnEsc);
                }
            });
        }
    };
    
    // Copy QR image URL
    window.copyQRImageURL = function() {
        const qrImage = document.getElementById('generatedQRImage');
        if (qrImage && qrImage.src) {
            navigator.clipboard.writeText(qrImage.src)
                .then(() => showNotification('QR image URL copied to clipboard!', 'success'))
                .catch(() => showNotification('Failed to copy URL', 'error'));
        }
    };
    
    // Share QR code
    window.shareQRCode = async function() {
        const qrImage = document.getElementById('generatedQRImage');
        if (qrImage && qrImage.src) {
            try {
                if (navigator.share) {
                    await navigator.share({
                        title: 'Attendance QR Code',
                        text: `Scan this QR code for ${document.getElementById('qrUnitName').textContent}`,
                        url: qrImage.src
                    });
                } else {
                    // Fallback: copy image to clipboard
                    const canvas = document.querySelector("#qrcode canvas");
                    if (canvas) {
                        canvas.toBlob(blob => {
                            const item = new ClipboardItem({ 'image/png': blob });
                            navigator.clipboard.write([item])
                                .then(() => showNotification('QR code copied to clipboard!', 'success'))
                                .catch(() => showNotification('Failed to copy QR code', 'error'));
                        });
                    }
                }
            } catch (error) {
                console.error('Share failed:', error);
                showNotification('Sharing not supported', 'info');
            }
        }
    };
    
    function displayQRInfo(qrData) {
        document.getElementById('qrUnitName').textContent = qrData.unitName;
        document.getElementById('qrUnitCode').textContent = qrData.unitCode;
        document.getElementById('qrClassType').textContent = qrData.classType;
        document.getElementById('qrTopic').textContent = qrData.topic || 'Not specified';
        document.getElementById('qrLecturer').textContent = qrData.lecturerName || qrData.lecturer;
        document.getElementById('qrGenerated').textContent = new Date(qrData.createdAt).toLocaleString();
        document.getElementById('qrExpires').textContent = new Date(qrData.expiresAt).toLocaleString();
        document.getElementById('qrDuration').textContent = qrData.duration;
        document.getElementById('qrCodeId').textContent = qrData.qrCodeId;
    }
    
    async function saveQRToBackend(qrData) {
        try {
            console.log('Saving QR to backend:', qrData);
            
            const response = await fetch(`${API_BASE_URL}/api/qrcodes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(qrData)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Error saving QR to backend:', error);
            throw error;
        }
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
            const response = await fetch(`${API_BASE_URL}/api/qrcodes`);
            
            if (response.ok) {
                const qrCodes = await response.json();
                console.log('Loaded QR codes:', qrCodes.length);
                displayRecentQRCodes(qrCodes);
            } else {
                console.error('Failed to load QR codes:', response.status);
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
        
        let html = '';
        
        qrCodes.forEach(qr => {
            const expiryDate = new Date(qr.expiresAt);
            const now = new Date();
            const isExpired = now > expiryDate;
            const isActive = qr.isActive && !isExpired;
            
            const status = isActive ? 
                '<span class="status-badge active">Active</span>' : 
                '<span class="status-badge expired">Expired</span>';
            
            // Parse qrData if it's a string
            let qrDataObj;
            try {
                qrDataObj = typeof qr.qrData === 'string' ? JSON.parse(qr.qrData) : qr;
            } catch {
                qrDataObj = qr;
            }
            
            html += `
                <tr>
                    <td>${qrDataObj.unitName || qr.unitName}</td>
                    <td>${qrDataObj.unitCode || qr.unitCode}</td>
                    <td>${new Date(qr.createdAt).toLocaleDateString()}</td>
                    <td>${status}</td>
                    <td>
                        <button class="btn btn-sm btn-info view-qr-btn" 
                                data-qrdata='${JSON.stringify(qrDataObj).replace(/'/g, "&#39;")}'>
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn btn-sm btn-primary display-qr-btn" 
                                data-qrdata='${JSON.stringify(qrDataObj).replace(/'/g, "&#39;")}'>
                            <i class="fas fa-display"></i> Display
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        
        // Add event listeners
        document.querySelectorAll('.view-qr-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const qrData = JSON.parse(this.dataset.qrdata.replace(/&#39;/g, "'"));
                displayQRInfo(qrData);
                generateQRCodeImage(JSON.stringify(qrData), qrData.qrCodeId);
                document.getElementById('qrDisplay').style.display = 'block';
                document.getElementById('qrDisplay').scrollIntoView({ behavior: 'smooth' });
            });
        });
        
        document.querySelectorAll('.display-qr-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const qrData = JSON.parse(this.dataset.qrdata.replace(/&#39;/g, "'"));
                displayQRForClass(qrData);
            });
        });
    }
    
    // Display QR code for classroom projection
    function displayQRForClass(qrData) {
        const displayWindow = window.open('', 'QRDisplay', 'width=800,height=600,menubar=no,toolbar=no,location=no');
        
        const displayHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>QR Code Display - ${qrData.unitName}</title>
                <style>
                    body {
                        margin: 0;
                        padding: 20px;
                        font-family: Arial, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        min-height: 100vh;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                    }
                    .qr-display-container {
                        text-align: center;
                        background: rgba(255,255,255,0.1);
                        backdrop-filter: blur(10px);
                        padding: 40px;
                        border-radius: 20px;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                        max-width: 800px;
                        width: 90%;
                    }
                    .class-info {
                        margin-bottom: 30px;
                    }
                    .class-info h1 {
                        margin: 0;
                        font-size: 2.5rem;
                        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                    }
                    .class-info h2 {
                        margin: 10px 0;
                        font-size: 1.8rem;
                        opacity: 0.9;
                    }
                    .qr-code-container {
                        margin: 30px 0;
                        padding: 20px;
                        background: white;
                        border-radius: 15px;
                        display: inline-block;
                    }
                    .qr-code-container img {
                        width: 400px;
                        height: 400px;
                        border: 5px solid #fff;
                        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                    }
                    .timer {
                        font-size: 2rem;
                        margin: 20px 0;
                        font-weight: bold;
                        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                    }
                    .instructions {
                        margin-top: 30px;
                        font-size: 1.2rem;
                        max-width: 600px;
                    }
                    .instructions ol {
                        text-align: left;
                        display: inline-block;
                    }
                    .qr-id {
                        background: rgba(255,255,255,0.2);
                        padding: 10px 20px;
                        border-radius: 10px;
                        margin-top: 20px;
                        font-family: monospace;
                    }
                </style>
                <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\/script>
            </head>
            <body>
                <div class="qr-display-container">
                    <div class="class-info">
                        <h1>${qrData.unitName}</h1>
                        <h2>${qrData.unitCode} - ${qrData.classType}</h2>
                        <p>Lecturer: ${qrData.lecturerName}</p>
                        <p>Topic: ${qrData.topic || 'General Session'}</p>
                    </div>
                    
                    <div class="timer" id="timer">
                        Valid for: <span id="countdown">${qrData.duration}:00</span>
                    </div>
                    
                    <div class="qr-code-container" id="qrcode"></div>
                    
                    <div class="qr-id">
                        QR ID: ${qrData.qrCodeId}
                    </div>
                    
                    <div class="instructions">
                        <h3>📱 Instructions for Students:</h3>
                        <ol>
                            <li>Open IN Attendance App</li>
                            <li>Go to "Scan QR Code"</li>
                            <li>Point camera at this QR code</li>
                            <li>Hold steady until scan is successful</li>
                            <li>Attendance will be automatically recorded</li>
                        </ol>
                    </div>
                </div>
                
                <script>
                    // Generate QR code
                    const qrcode = new QRCode(document.getElementById("qrcode"), {
                        text: '${JSON.stringify(qrData).replace(/'/g, "\\'")}',
                        width: 400,
                        height: 400,
                        colorDark: "#000000",
                        colorLight: "#FFFFFF",
                        correctLevel: QRCode.CorrectLevel.H
                    });
                    
                    // Countdown timer
                    let totalSeconds = ${qrData.duration} * 60;
                    const countdownElement = document.getElementById('countdown');
                    
                    function updateTimer() {
                        if (totalSeconds <= 0) {
                            countdownElement.innerHTML = "EXPIRED";
                            countdownElement.style.color = "#ff6b6b";
                            return;
                        }
                        
                        const minutes = Math.floor(totalSeconds / 60);
                        const seconds = totalSeconds % 60;
                        
                        countdownElement.innerHTML = 
                            minutes.toString().padStart(2, '0') + ':' + 
                            seconds.toString().padStart(2, '0');
                        
                        totalSeconds--;
                        
                        // Color change warning
                        if (totalSeconds < 300) { // 5 minutes
                            countdownElement.style.color = "#ffa500";
                        }
                        if (totalSeconds < 60) { // 1 minute
                            countdownElement.style.color = "#ff6b6b";
                        }
                    }
                    
                    // Update timer every second
                    setInterval(updateTimer, 1000);
                    updateTimer(); // Initial call
                    
                    // Auto-refresh QR code every 30 seconds (optional)
                    setInterval(() => {
                        document.location.reload();
                    }, 30000);
                <\/script>
            </body>
            </html>
        `;
        
        displayWindow.document.write(displayHTML);
        displayWindow.document.close();
    }
    
    // Print QR code with details
    function printQRCode() {
        const printWindow = window.open('', '_blank');
        
        const qrImage = document.getElementById('generatedQRImage');
        const qrImageSrc = qrImage ? qrImage.src : '';
        
        const printHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Attendance QR Code - ${document.getElementById('qrUnitName').textContent}</title>
                <style>
                    @media print {
                        @page { margin: 0.5in; }
                        body { font-family: Arial, sans-serif; }
                        .print-container { max-width: 800px; margin: 0 auto; }
                        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                        .qr-section { text-align: center; margin: 30px 0; }
                        .qr-image { width: 400px; height: 400px; border: 1px solid #000; }
                        .details { margin-top: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
                        .detail-row { display: flex; margin-bottom: 10px; }
                        .detail-label { font-weight: bold; width: 150px; }
                        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
                    }
                    body { font-family: Arial, sans-serif; }
                    .print-container { max-width: 800px; margin: 0 auto; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                    .qr-section { text-align: center; margin: 30px 0; }
                    .qr-image { width: 400px; height: 400px; border: 1px solid #000; }
                    .details { margin-top: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
                    .detail-row { display: flex; margin-bottom: 10px; }
                    .detail-label { font-weight: bold; width: 150px; }
                    .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="print-container">
                    <div class="header">
                        <h1>IN Attendance System</h1>
                        <h2>Class Attendance QR Code</h2>
                    </div>
                    
                    <div class="qr-section">
                        <h3>Scan this QR Code for Attendance</h3>
                        ${qrImageSrc ? `<img src="${qrImageSrc}" class="qr-image" alt="QR Code">` : '<p>QR Code Image</p>'}
                    </div>
                    
                    <div class="details">
                        <h3>Class Information</h3>
                        <div class="detail-row">
                            <div class="detail-label">Unit Name:</div>
                            <div>${document.getElementById('qrUnitName').textContent}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Unit Code:</div>
                            <div>${document.getElementById('qrUnitCode').textContent}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Class Type:</div>
                            <div>${document.getElementById('qrClassType').textContent}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Topic:</div>
                            <div>${document.getElementById('qrTopic').textContent}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Lecturer:</div>
                            <div>${document.getElementById('qrLecturer').textContent}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Generated:</div>
                            <div>${document.getElementById('qrGenerated').textContent}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Expires:</div>
                            <div>${document.getElementById('qrExpires').textContent}</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">Duration:</div>
                            <div>${document.getElementById('qrDuration').textContent} minutes</div>
                        </div>
                        <div class="detail-row">
                            <div class="detail-label">QR Code ID:</div>
                            <div>${document.getElementById('qrCodeId').textContent}</div>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>Generated by IN Attendance System | ${new Date().toLocaleString()}</p>
                        <p>Valid for attendance until: ${document.getElementById('qrExpires').textContent}</p>
                    </div>
                </div>
                
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(() => window.close(), 1000);
                    };
                <\/script>
            </body>
            </html>
        `;
        
        printWindow.document.write(printHTML);
        printWindow.document.close();
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
        if (!localStorage.getItem('user')) {
            localStorage.setItem('user', JSON.stringify({
                id: 'ID1',
                name: 'yusuf hassan',
                role: 'Lecturer',
                email: 'lecturer@example.com'
            }));
        }
        
        const user = JSON.parse(localStorage.getItem('user'));
        document.getElementById('userName').textContent = user.name || 'Lecturer';
        document.getElementById('userAvatar').textContent = getInitials(user.name);
        document.getElementById('miniAvatar').textContent = getInitials(user.name);
        document.getElementById('userRole').textContent = user.role || 'Lecturer';
    }
    
    function getInitials(name) {
        return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'JD';
    }
});
