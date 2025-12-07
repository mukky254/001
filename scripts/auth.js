// Authentication JavaScript
const API_BASE_URL = 'https://zero0-1-r0xs.onrender.com';
let currentUser = null;
let currentToken = null;

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
    checkExistingSession();
    setupEventListeners();
    handleURLParams();
});

function initializeAuth() {
    // Set current year in footer
    document.querySelectorAll('.current-year').forEach(el => {
        el.textContent = new Date().getFullYear();
    });
}

function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            switchTab(tabId);
        });
    });

    // Password toggle
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Role selection for registration
    const regRole = document.getElementById('regRole');
    if (regRole) {
        regRole.addEventListener('change', function() {
            const role = this.value;
            showRoleFields(role);
        });
    }

    // Password strength checker
    const regPassword = document.getElementById('regPassword');
    if (regPassword) {
        regPassword.addEventListener('input', checkPasswordStrength);
    }

    // Form submissions
    const loginForm = document.getElementById('loginFormData');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }

    const registerForm = document.getElementById('registerFormData');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegisterSubmit);
    }

    // Initialize sample data button
    const initSampleBtn = document.getElementById('initSampleBtn');
    if (initSampleBtn) {
        initSampleBtn.addEventListener('click', initializeSampleData);
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

function handleURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    
    if (tab === 'register') {
        switchTab('register');
    }
}

function switchTab(tabId) {
    // Update tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });

    // Update forms
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.toggle('active', form.id === tabId + 'Form');
    });

    // Update URL
    const url = new URL(window.location);
    url.searchParams.set('tab', tabId);
    window.history.replaceState({}, '', url);
}

function showRoleFields(role) {
    const studentFields = document.getElementById('studentFields');
    const lecturerFields = document.getElementById('lecturerFields');

    if (studentFields) studentFields.style.display = role === 'student' ? 'block' : 'none';
    if (lecturerFields) lecturerFields.style.display = role === 'lecturer' ? 'block' : 'none';
}

function checkPasswordStrength() {
    const password = this.value;
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.getElementById('strengthText');
    
    let strength = 0;
    let color = '#ef4444';
    let text = 'Weak';

    // Check password criteria
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    switch(strength) {
        case 1:
            color = '#ef4444';
            text = 'Weak';
            break;
        case 2:
            color = '#f59e0b';
            text = 'Fair';
            break;
        case 3:
            color = '#3b82f6';
            text = 'Good';
            break;
        case 4:
            color = '#10b981';
            text = 'Strong';
            break;
    }

    if (strengthBar) {
        strengthBar.style.width = (strength * 25) + '%';
        strengthBar.style.backgroundColor = color;
    }
    
    if (strengthText) {
        strengthText.textContent = text;
        strengthText.style.color = color;
    }
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('loginId').value;
    const password = document.getElementById('loginPassword').value;
    const role = document.getElementById('loginRole').value;
    const loginBtn = document.getElementById('loginBtn');

    // Validation
    if (!id || !password || !role) {
        showAlert('Please fill in all fields', 'error');
        return;
    }

    // Show loading
    setButtonLoading(loginBtn, true);

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id, password, role })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Store user session
            currentUser = data.user;
            currentToken = data.token;
            
            localStorage.setItem('attendance_session', JSON.stringify({
                user: currentUser,
                token: currentToken,
                expires: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
            }));

            showAlert('Login successful! Redirecting...', 'success');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            throw new Error(data.message || 'Login failed');
        }
    } catch (error) {
        showAlert(error.message || 'Login failed. Please check your credentials.', 'error');
    } finally {
        setButtonLoading(loginBtn, false);
    }
}

async function handleRegisterSubmit(e) {
    e.preventDefault();
    
    const role = document.getElementById('regRole').value;
    const name = document.getElementById('regName').value;
    const id = document.getElementById('regId').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const registerBtn = document.getElementById('registerBtn');

    // Validation
    if (!role || !name || !id || !email || !phone || !password) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showAlert('Passwords do not match', 'error');
        return;
    }

    if (password.length < 6) {
        showAlert('Password must be at least 6 characters long', 'error');
        return;
    }

    // Prepare user data
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
    setButtonLoading(registerBtn, true);

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showAlert('Registration successful! You can now login.', 'success');
            
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
        showAlert(error.message || 'Registration failed. Please try again.', 'error');
    } finally {
        setButtonLoading(registerBtn, false);
    }
}

async function initializeSampleData() {
    if (!confirm('This will initialize sample data in the database. Do you want to continue?')) {
        return;
    }

    const initBtn = document.getElementById('initSampleBtn');
    const originalText = initBtn.innerHTML;
    initBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Initializing...';
    initBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/init-sample-data`, {
            method: 'POST'
        });

        const data = await response.json();

        if (response.ok && data.success) {
            showAlert('Sample data initialized successfully! You can now login with:', 'success');
            
            // Show sample credentials
            const credentials = `
                <div class="sample-credentials">
                    <h4>Sample Users:</h4>
                    <p><strong>Admin:</strong> ID: AD001, Password: admin123</p>
                    <p><strong>Lecturer:</strong> ID: LT001, Password: lecturer123</p>
                    <p><strong>Student:</strong> ID: ST001, Password: student123</p>
                </div>
            `;
            
            showAlert(credentials, 'info', 10000);
            
            // Auto-fill login form
            setTimeout(() => {
                switchTab('login');
            }, 2000);
        } else {
            throw new Error(data.message || 'Failed to initialize sample data');
        }
    } catch (error) {
        showAlert(error.message || 'Failed to initialize sample data', 'error');
    } finally {
        initBtn.innerHTML = originalText;
        initBtn.disabled = false;
    }
}

function checkExistingSession() {
    const sessionData = localStorage.getItem('attendance_session');
    
    if (sessionData) {
        const session = JSON.parse(sessionData);
        
        // Check if session is expired
        if (Date.now() > session.expires) {
            localStorage.removeItem('attendance_session');
            return;
        }

        currentUser = session.user;
        currentToken = session.token;

        // Redirect to dashboard if already logged in
        if (window.location.pathname.includes('login.html') || 
            window.location.pathname === '/' || 
            window.location.pathname.includes('index.html')) {
            window.location.href = 'dashboard.html';
        }
    }
}

function setButtonLoading(button, isLoading) {
    const btnText = button.querySelector('.btn-text');
    const btnSpinner = button.querySelector('.btn-spinner');
    
    if (isLoading) {
        btnText.style.display = 'none';
        btnSpinner.style.display = 'inline-block';
        button.disabled = true;
        button.classList.add('loading');
    } else {
        btnText.style.display = 'inline-block';
        btnSpinner.style.display = 'none';
        button.disabled = false;
        button.classList.remove('loading');
    }
}

function showAlert(message, type = 'info', duration = 5000) {
    // Create alert container if it doesn't exist
    let alertContainer = document.getElementById('authAlerts');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'authAlerts';
        alertContainer.className = 'auth-alerts';
        document.body.appendChild(alertContainer);
    }

    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    // Add to container
    alertContainer.appendChild(alert);

    // Remove after duration
    setTimeout(() => {
        alert.style.opacity = '0';
        alert.style.transform = 'translateX(100%)';
        setTimeout(() => {
            alert.remove();
        }, 300);
    }, duration);

    // Click to dismiss
    alert.addEventListener('click', () => {
        alert.style.opacity = '0';
        alert.style.transform = 'translateX(100%)';
        setTimeout(() => {
            alert.remove();
        }, 300);
    });
}

// Logout function (available globally)
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('attendance_session');
        currentUser = null;
        currentToken = null;
        window.location.href = 'index.html';
    }
}

// Export for use in other files
window.authModule = {
    getCurrentUser: () => currentUser,
    getToken: () => currentToken,
    logout,
    showAlert,
    API_BASE_URL
};
