// scripts/auth.js - FIXED
const API_BASE_URL = 'https://zero0-1-r0xs.onrender.com';

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Auth page loaded');
    console.log('📡 Backend URL:', API_BASE_URL);
    
    setupEventListeners();
    checkExistingSession();
    
    // Test backend connection immediately
    testBackendConnection();
});

async function testBackendConnection() {
    try {
        console.log('Testing connection to backend...');
        const response = await fetch(API_BASE_URL);
        const data = await response.json();
        console.log('✅ Backend is working:', data);
    } catch (error) {
        console.error('❌ Backend connection failed:', error);
        showAlert('⚠️ Backend connection failed. Using test mode.', 'warning');
    }
}

function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });
    
    // Login form
    const loginForm = document.getElementById('loginFormData');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Register form
    const registerForm = document.getElementById('registerFormData');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Password toggle
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'fas fa-eye';
            }
        });
    });
    
    // Initialize sample data button
    const initBtn = document.getElementById('initSampleBtn');
    if (initBtn) {
        initBtn.addEventListener('click', initializeSampleData);
    }
    
    // Switch to login link
    const switchToLogin = document.querySelector('.switch-to-login');
    if (switchToLogin) {
        switchToLogin.addEventListener('click', function(e) {
            e.preventDefault();
            switchTab('login');
        });
    }
}

function switchTab(tabName) {
    // Update tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Update forms
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.toggle('active', form.id === tabName + 'Form');
    });
}

async function handleLogin(e) {
    e.preventDefault();
    
    const id = document.getElementById('loginId').value;
    const password = document.getElementById('loginPassword').value;
    const role = document.getElementById('loginRole').value;
    
    console.log('Login attempt:', { id, role });
    
    // Validation
    if (!id || !password || !role) {
        showAlert('Please fill in all fields', 'error');
        return;
    }
    
    // Show loading
    const loginBtn = document.getElementById('loginBtn');
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    loginBtn.disabled = true;
    
    try {
        console.log('Sending login request to:', `${API_BASE_URL}/api/auth/login`);
        
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id, password, role })
        });
        
        console.log('Response status:', response.status);
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.ok && data.success) {
            // Save session
            localStorage.setItem('attendance_session', JSON.stringify({
                user: data.user,
                token: data.token,
                timestamp: new Date().toISOString()
            }));
            
            showAlert('✅ Login successful! Redirecting...', 'success');
            
            // Redirect after delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
            
        } else {
            throw new Error(data.message || 'Login failed');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showAlert('❌ ' + error.message, 'error');
        
        // Fallback to hardcoded test credentials
        showAlert('Try test credentials: Admin: AD001/admin123, Lecturer: LT001/lecturer123, Student: ST001/student123', 'info');
        
    } finally {
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const role = document.getElementById('regRole').value;
    const name = document.getElementById('regName').value;
    const id = document.getElementById('regId').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    
    console.log('Register attempt:', { id, name, role });
    
    // Validation
    if (!role || !name || !id || !email || !phone || !password) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showAlert('Passwords do not match', 'error');
        return;
    }
    
    // Prepare data
    const userData = {
        role,
        name,
        id,
        email,
        phone,
        password
    };
    
    // Add role-specific fields
    if (role === 'student') {
        const course = document.getElementById('regCourse').value;
        const year = document.getElementById('regYear').value;
        userData.course = course;
        userData.year = year;
    } else if (role === 'lecturer') {
        const department = document.getElementById('regDepartment').value;
        userData.department = department;
    }
    
    // Show loading
    const registerBtn = document.getElementById('registerBtn');
    const originalText = registerBtn.innerHTML;
    registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
    registerBtn.disabled = true;
    
    try {
        console.log('Sending register request to:', `${API_BASE_URL}/api/auth/register`);
        
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        console.log('Register response:', data);
        
        if (response.ok && data.success) {
            showAlert('✅ Registration successful! Please login.', 'success');
            
            // Clear form and switch to login
            setTimeout(() => {
                document.getElementById('registerFormData').reset();
                switchTab('login');
                document.getElementById('loginId').value = id;
                document.getElementById('loginRole').value = role;
            }, 1500);
            
        } else {
            throw new Error(data.message || 'Registration failed');
        }
        
    } catch (error) {
        console.error('Register error:', error);
        showAlert('❌ ' + error.message, 'error');
        
        // Fallback - show test credentials
        showAlert('For testing, use: Admin: AD001/admin123, Lecturer: LT001/lecturer123, Student: ST001/student123', 'info');
        
    } finally {
        registerBtn.innerHTML = originalText;
        registerBtn.disabled = false;
    }
}

async function initializeSampleData() {
    if (!confirm('This will initialize sample data. Continue?')) return;
    
    const initBtn = document.getElementById('initSampleBtn');
    const originalText = initBtn.innerHTML;
    initBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Initializing...';
    initBtn.disabled = true;
    
    try {
        console.log('Initializing sample data at:', `${API_BASE_URL}/api/init-sample-data`);
        
        const response = await fetch(`${API_BASE_URL}/api/init-sample-data`, {
            method: 'POST'
        });
        
        const data = await response.json();
        console.log('Init response:', data);
        
        if (response.ok && data.success) {
            showAlert('✅ Sample data initialized! Use test credentials to login.', 'success');
            
            // Switch to login tab and show credentials
            setTimeout(() => {
                switchTab('login');
                
                // Update sample data info
                const sampleInfo = document.querySelector('.sample-data-info');
                if (sampleInfo) {
                    sampleInfo.innerHTML = `
                        <p><strong>✅ Sample Users Created:</strong></p>
                        <ul>
                            <li><strong>Admin:</strong> ID: AD001, Password: admin123</li>
                            <li><strong>Lecturer:</strong> ID: LT001, Password: lecturer123</li>
                            <li><strong>Student:</strong> ID: ST001, Password: student123</li>
                        </ul>
                    `;
                }
            }, 2000);
            
        } else {
            throw new Error(data.message || 'Failed to initialize');
        }
        
    } catch (error) {
        console.error('Init error:', error);
        showAlert('❌ ' + error.message, 'error');
        
        // Show fallback credentials
        showAlert(`
            <strong>Test Credentials:</strong><br>
            • Admin: ID: AD001, Password: admin123<br>
            • Lecturer: ID: LT001, Password: lecturer123<br>
            • Student: ID: ST001, Password: student123
        `, 'info');
        
    } finally {
        initBtn.innerHTML = originalText;
        initBtn.disabled = false;
    }
}

function checkExistingSession() {
    const session = localStorage.getItem('attendance_session');
    if (session) {
        try {
            const sessionData = JSON.parse(session);
            if (sessionData.user) {
                // Redirect to dashboard if already logged in
                window.location.href = 'dashboard.html';
            }
        } catch (e) {
            console.error('Session parse error:', e);
            localStorage.removeItem('attendance_session');
        }
    }
}

function showAlert(message, type = 'info') {
    // Create or get alert container
    let alertContainer = document.getElementById('authAlerts');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'authAlerts';
        alertContainer.className = 'auth-alerts';
        document.body.appendChild(alertContainer);
    }
    
    // Create alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    // Set icon based on type
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    
    alert.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
        <button class="alert-close" style="
            background: none;
            border: none;
            color: inherit;
            margin-left: auto;
            cursor: pointer;
        ">×</button>
    `;
    
    alertContainer.appendChild(alert);
    
    // Add close functionality
    const closeBtn = alert.querySelector('.alert-close');
    closeBtn.addEventListener('click', () => {
        alert.style.opacity = '0';
        alert.style.transform = 'translateX(100%)';
        setTimeout(() => alert.remove(), 300);
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.style.opacity = '0';
            alert.style.transform = 'translateX(100%)';
            setTimeout(() => alert.remove(), 300);
        }
    }, 5000);
}

// Make functions globally available
window.showAlert = showAlert;
window.API_BASE_URL = API_BASE_URL;
window.logout = function() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('attendance_session');
        window.location.href = 'index.html';
    }
};
