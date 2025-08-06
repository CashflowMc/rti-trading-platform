// Updated dashboard.js with WORKING authentication
// Replace your existing handleLogin function with this working version

// WORKING LOGIN FUNCTION - Replace your existing one
const handleLogin = async () => {
  console.log('🔐 Starting login with WORKING credentials...');
  
  // Get credentials from form fields (or use working defaults)
  const usernameField = document.querySelector('input[name="username"], input[type="text"]');
  const passwordField = document.querySelector('input[name="password"], input[type="password"]');
  
  // Use form values or working defaults
  const username = usernameField?.value?.trim() || 'admin';
  const password = passwordField?.value?.trim() || 'password';
  
  console.log('📝 Using credentials:', { username, password: password ? '[PROVIDED]' : '[MISSING]' });
  
  try {
    // Show loading state
    const loginBtn = document.querySelector('#login-btn, .login-button, button[type="submit"]');
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = 'Logging in...';
    }
    
    console.log('🚀 Making authentication request...');
    
    // Use the WORKING data format that we discovered
    const formData = new FormData();
    formData.append('endpoint', '/auth/login');
    formData.append('method', 'POST');
    formData.append('headers', JSON.stringify({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }));
    formData.append('data', JSON.stringify({
      username: username,
      password: password
    }));
    
    const response = await fetch('/api_proxy', {
      method: 'POST',
      body: formData
    });
    
    console.log('📊 Response status:', response.status);
    
    if (response.status === 200) {
      const result = await response.json();
      console.log('✅ Login successful!', result);
      
      // Extract the response data (might be nested in result.data)
      const authData = result.data || result;
      
      if (authData.token) {
        // Store authentication data
        localStorage.setItem('authToken', authData.token);
        localStorage.setItem('userInfo', JSON.stringify(authData.user));
        
        console.log('💾 Auth data stored successfully');
        console.log('🔑 Token:', authData.token.substring(0, 20) + '...');
        console.log('👤 User:', authData.user.username);
        
        // Handle successful login
        handleLoginSuccess(authData);
        return true;
        
      } else {
        console.log('❌ No token received:', authData);
        showError('Login failed: No authentication token received');
        return false;
      }
      
    } else {
      console.log('❌ Login failed with status:', response.status);
      const errorText = await response.text();
      console.log('Error details:', errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        showError(errorData.error || 'Login failed');
      } catch (e) {
        showError('Login failed: Invalid response from server');
      }
      
      return false;
    }
    
  } catch (error) {
    console.error('💥 Network error during login:', error);
    showError('Login failed: Network error. Please check your connection.');
    return false;
    
  } finally {
    // Reset login button
    const loginBtn = document.querySelector('#login-btn, .login-button, button[type="submit"]');
    if (loginBtn) {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Login';
    }
  }
};

// Handle successful login - integrate with your existing dashboard
const handleLoginSuccess = (authData) => {
  console.log('🎉 Processing successful login...');
  
  try {
    // Update page state
    const loginContainer = document.querySelector('.login-container, .auth-container, #login-form');
    const dashboardContainer = document.querySelector('.dashboard-container, #dashboard, .main-dashboard');
    
    if (loginContainer) {
      loginContainer.style.display = 'none';
      console.log('✅ Login form hidden');
    }
    
    if (dashboardContainer) {
      dashboardContainer.style.display = 'block';
      console.log('✅ Dashboard shown');
    }
    
    // Update user info in UI
    const usernameDisplays = document.querySelectorAll('.username-display, .user-name, .current-user');
    usernameDisplays.forEach(element => {
      element.textContent = authData.user.username;
    });
    
    const avatarElements = document.querySelectorAll('.user-avatar, .avatar-img');
    avatarElements.forEach(element => {
      if (element.tagName === 'IMG') {
        element.src = authData.user.avatar;
      } else {
        element.style.backgroundImage = `url(${authData.user.avatar})`;
      }
    });
    
    // Add admin class if user is admin
    if (authData.user.isAdmin) {
      document.body.classList.add('admin-user');
      console.log('🛡️ Admin privileges enabled');
    }
    
    // Update page title
    document.title = `RTi Cashflow Dashboard - ${authData.user.username}`;
    
    // Initialize dashboard data if you have init functions
    if (typeof initDashboard === 'function') {
      initDashboard();
    }
    
    console.log('✅ Login success handling completed');
    
  } catch (error) {
    console.error('❌ Error in login success handler:', error);
  }
};

// Show error message to user
const showError = (message) => {
  console.log('❌ Showing error:', message);
  
  // Try to find and update existing error display
  const errorElements = document.querySelectorAll('.error-message, .login-error, .alert-error');
  
  if (errorElements.length > 0) {
    errorElements.forEach(element => {
      element.textContent = message;
      element.style.display = 'block';
      element.classList.add('show');
    });
  } else {
    // Create error message if none exists
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      background: #fee;
      color: #c53030;
      padding: 12px;
      border: 1px solid #fed7d7;
      border-radius: 6px;
      margin: 10px 0;
      display: block;
    `;
    
    const loginForm = document.querySelector('.login-form, .auth-form');
    if (loginForm) {
      loginForm.insertBefore(errorDiv, loginForm.firstChild);
    }
  }
  
  // Auto-hide error after 5 seconds
  setTimeout(() => {
    errorElements.forEach(element => {
      element.style.display = 'none';
    });
  }, 5000);
};

// Check if user is already authenticated
const checkExistingAuth = () => {
  const token = localStorage.getItem('authToken');
  const userInfo = localStorage.getItem('userInfo');
  
  if (token && userInfo) {
    console.log('🔍 Found existing authentication');
    try {
      const user = JSON.parse(userInfo);
      handleLoginSuccess({ token, user });
      return true;
    } catch (error) {
      console.log('❌ Invalid stored auth data, clearing...');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userInfo');
    }
  }
  
  return false;
};

// Initialize authentication system
const initAuth = () => {
  console.log('🔧 Initializing authentication system...');
  
  // Check for existing auth
  if (checkExistingAuth()) {
    console.log('✅ User already authenticated');
    return;
  }
  
  // Bind login form submission
  const loginForm = document.querySelector('form, .login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleLogin();
    });
  }
  
  // Bind login button
  const loginButton = document.querySelector('#login-btn, .login-button, button[type="submit"]');
  if (loginButton) {
    loginButton.addEventListener('click', (e) => {
      if (loginButton.type !== 'submit') {
        e.preventDefault();
        handleLogin();
      }
    });
  }
  
  console.log('✅ Authentication system initialized');
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  initAuth();
}

// WORKING CREDENTIALS FOR TESTING
console.log('🎉 WORKING Dashboard.js loaded!');
console.log('🔑 Working credentials: admin / password');
console.log('💡 Authentication system ready');

// Make functions available globally for debugging
window.handleLogin = handleLogin;
window.testWorkingAuth = () => {
  console.log('🧪 Testing working authentication...');
  return handleLogin();
};
