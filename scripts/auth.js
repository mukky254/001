// Auth JavaScript - SIMPLIFIED
const API_BASE_URL = 'https://your-backend.onrender.com'; // ← CHANGE THIS

document.addEventListener('DOMContentLoaded', function() {
    console.log('Auth page loaded');
    console.log('API Base URL:', API_BASE_URL);
    
    setupEventListeners();
    checkExistingSession();
});

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
    
    // Init sample data button
    const initBtn = document.getElementById('initSampleBtn');
    if (initBtn) {
        initBtn.addEventListener('click', initializeSampleData);
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
        console.log('Sending request to:', `${API_BASE_URL}/api/auth/login`);
        
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
            
            showAlert('Login successful! Redirecting...', 'success');
            
            // Redirect after delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
            
        } else {
            throw new Error(data.message || 'Login failed');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showAlert(error.message || 'Login failed. Please try again.', 'error');
        
        // Fallback to test credentials
        if (id === 'AD001' && password === 'admin123' && role === 'admin') {
            showAlert('Using test credentials...', 'warning');
            const testUser = {
                id: 'AD001',
                name: 'Test Admin',
                email: 'admin@test.com',
                role: 'admin'
            };
            localStorage.setItem('attendance_session', JSON.stringify({
                user: testUser,
                token: 'test_token',
                timestamp: new Date().toISOString()
            }));
            setTimeout(() => window.location.href = 'dashboard.html', 1000);
        }
        
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
    
    // Validation
    if (!role || !name || !id || !email || !phone || !password) {
        showAlert('Please fill in all fields', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showAlert('Passwords do not match', 'error');
        return;
    }
    
    // Show loading
    const registerBtn = document.getElementById('registerBtn');
    const originalText = registerBtn.innerHTML;
    registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';
    registerBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id, name, email, phone, password, role,
                course: role === 'student' ? document.getElementById('regCourse').value : '',
                year: role === 'student' ? document.getElementById('regYear').value : 1
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            showAlert('Registration successful! Please login.', 'success');
            
            // Switch to login tab
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
        showAlert(error.message || 'Registration failed. Please try again.', 'error');
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
            
            // Show credentials
            setTimeout(() => {
                switchTab('login');
            }, 2000);
            
        } else {
            throw new Error(data.message || 'Failed to initialize');
        }
        
    } catch (error) {
        console.error('Init error:', error);
        showAlert('Failed to initialize sample data. Using hardcoded credentials instead.', 'warning');
        
        // Fallback - just show test credentials
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
                // Redirect to dashboard
                window.location.href = 'dashboard.html';
            }
        } catch (e) {
            console.error('Session parse error:', e);
            localStorage.removeItem('attendance_session');
        }
    }
}

// Global logout function
window.logout = function() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('attendance_session');
        window.location.href = 'index.html';
    }
};
