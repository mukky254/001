// Main JavaScript - SIMPLIFIED
const API_BASE_URL = 'https://your-backend.onrender.com'; // ← CHANGE THIS

document.addEventListener('DOMContentLoaded', function() {
    // Test backend connection
    testBackendConnection();
    
    // Check login status
    checkLoginStatus();
    
    // Setup mobile menu
    setupMobileMenu();
});

async function testBackendConnection() {
    try {
        console.log('Testing connection to:', API_BASE_URL);
        
        const response = await fetch(API_BASE_URL);
        const data = await response.json();
        
        console.log('✅ Backend response:', data);
        
        // Update server status if element exists
        const serverStatus = document.getElementById('serverStatus');
        if (serverStatus) {
            serverStatus.textContent = 'Online';
            serverStatus.className = 'badge bg-success';
        }
        
    } catch (error) {
        console.error('❌ Backend connection failed:', error);
        
        // Try alternative URL
        const alternativeURL = API_BASE_URL.replace('https://', 'http://');
        console.log('Trying alternative:', alternativeURL);
        
        // Update server status
        const serverStatus = document.getElementById('serverStatus');
        if (serverStatus) {
            serverStatus.textContent = 'Offline';
            serverStatus.className = 'badge bg-danger';
        }
        
        showAlert('⚠️ Backend connection failed. Please check if server is running.', 'warning');
    }
}

function checkLoginStatus() {
    const session = localStorage.getItem('attendance_session');
    if (session) {
        try {
            const userData = JSON.parse(session);
            // Update UI for logged in users
            const loginButtons = document.querySelectorAll('a[href="login.html"]');
            loginButtons.forEach(btn => {
                btn.innerHTML = '<i class="fas fa-tachometer-alt"></i> Dashboard';
                btn.href = 'dashboard.html';
            });
        } catch (e) {
            console.error('Error parsing session:', e);
        }
    }
}

function setupMobileMenu() {
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileBtn && navMenu) {
        mobileBtn.addEventListener('click', () => {
            navMenu.style.display = navMenu.style.display === 'flex' ? 'none' : 'flex';
        });
    }
}

function showAlert(message, type = 'info') {
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 400px;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease-out;
    `;
    
    // Add CSS for animation
    if (!document.querySelector('#alertStyle')) {
        const style = document.createElement('style');
        style.id = 'alertStyle';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Set icon based on type
    let icon = 'info-circle';
    let bgColor = '#dbeafe';
    let textColor = '#1e40af';
    let borderColor = '#bfdbfe';
    
    switch(type) {
        case 'success':
            icon = 'check-circle';
            bgColor = '#dcfce7';
            textColor = '#166534';
            borderColor = '#bbf7d0';
            break;
        case 'error':
            icon = 'exclamation-circle';
            bgColor = '#fee2e2';
            textColor = '#991b1b';
            borderColor = '#fecaca';
            break;
        case 'warning':
            icon = 'exclamation-triangle';
            bgColor = '#fef3c7';
            textColor = '#92400e';
            borderColor = '#fde68a';
            break;
    }
    
    alert.style.backgroundColor = bgColor;
    alert.style.color = textColor;
    alert.style.border = `1px solid ${borderColor}`;
    
    alert.innerHTML = `
        <i class="fas fa-${icon}" style="margin-right: 10px;"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="
            background: none;
            border: none;
            color: inherit;
            margin-left: 15px;
            cursor: pointer;
        ">×</button>
    `;
    
    document.body.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => alert.remove(), 300);
        }
    }, 5000);
}

// Make functions available globally
window.showAlert = showAlert;
window.API_BASE_URL = API_BASE_URL;
