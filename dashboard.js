// 📁 FILE: rti-trading-platform/js/dashboard.js
// Trading Dashboard JavaScript - BULLETPROOF WITH PHP PROXY

// 🛡️ BULLETPROOF CONFIGURATION - PHP PROXY ONLY
const PROXY_URL = 'https://cashflowops.pro/api-proxy.php';
// ❌ REMOVED: API_BASE_URL - we ONLY use PHP proxy now

// Global variables with BULLETPROOF initialization
let currentUser = null;
let socket = null;
let currentFilter = 'ALL';
let allAlerts = []; // CRITICAL: Always initialize as empty array
let allUsers = []; // CRITICAL: Always initialize as empty array

// DOM Elements
const successMessage = document.getElementById('successMessage');
const successText = document.getElementById('successText');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const upgradeBanner = document.getElementById('upgradeBanner');
const adminPanel = document.getElementById('adminPanel');
const adminPanelSection = document.getElementById('adminPanelSection');
const userProfile = document.getElementById('userProfile');
const userAvatar = document.getElementById('userAvatar');
const username = document.getElementById('username');
const userTier = document.getElementById('userTier');
const alertsContainer = document.getElementById('alertsContainer');
const loadingAlerts = document.getElementById('loadingAlerts');
const alertsPaywall = document.getElementById('alertsPaywall');
const blurredAlerts = document.getElementById('blurredAlerts');
const activeUsers = document.getElementById('activeUsers');
const userCount = document.getElementById('userCount');
const usersPaywall = document.getElementById('usersPaywall');
const hiddenUserCount = document.getElementById('hiddenUserCount');
const marketData = document.getElementById('marketData');
const marketPaywall = document.getElementById('marketPaywall');
const marketLimitedBadge = document.getElementById('marketLimitedBadge');

// 🛡️ BULLETPROOF PHP PROXY FETCH FUNCTION
const proxyFetch = async (endpoint, options = {}) => {
    try {
        const token = localStorage.getItem('token');
        
        // Clean endpoint (remove leading /api if present)
        const cleanEndpoint = endpoint.replace(/^\/api\//, '').replace(/^\//, '');
        
        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };

        const config = {
            method: 'GET',
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            }
        };

        // Build proxy URL
        const proxyEndpoint = `${PROXY_URL}?endpoint=${encodeURIComponent(cleanEndpoint)}`;
        
        console.log(`🛡️ BULLETPROOF Proxy request: ${config.method} ${cleanEndpoint}`);
        console.log(`📡 Full proxy URL: ${proxyEndpoint}`);
        
        const response = await fetch(proxyEndpoint, config);
        
        // Handle auth errors
        if (response.status === 401) {
            console.log('🔑 Unauthorized - clearing token');
            localStorage.removeItem('token');
            window.location.href = 'index.html';
            return null;
        }
        
        return response;
    } catch (error) {
        console.error('❌ Proxy fetch error:', error);
        throw error;
    }
};

// 🛡️ BULLETPROOF ARRAY SAFETY CHECK
function ensureArray(data, context = '') {
    if (Array.isArray(data)) {
        console.log(`✅ ${context} is valid array with ${data.length} items`);
        return data;
    } else {
        console.error(`🚨 CRITICAL: ${context} is not an array!`, typeof data, data);
        return [];
    }
}

// Initialize dashboard with BULLETPROOF error handling
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🛡️ BULLETPROOF Dashboard loaded with PHP Proxy ONLY');
    
    // BULLETPROOF: Ensure arrays are always arrays
    allAlerts = ensureArray(allAlerts, 'allAlerts on init');
    allUsers = ensureArray(allUsers, 'allUsers on init');
    
    try {
        // Check for payment success
        checkPaymentSuccess();
        
        // Load user profile
        await loadUserProfile();
        
        // Check if user is logged in
        if (!currentUser) {
            window.location.href = 'index.html';
            return;
        }
        
        // Check subscription status - redirect if no subscription on file
        if (requiresSubscriptionSelection()) {
            console.log('🔒 User needs to select subscription plan');
            showSubscriptionRequiredMessage();
            setTimeout(() => {
                window.location.href = 'subscription.html';
            }, 3000);
            return;
        }
        
        // Update UI based on user tier
        updateUIForUserTier();
        
        // Initialize Socket.IO with BULLETPROOF error handling
        initializeSocket();
        
        // Load data with BULLETPROOF error handling
        await Promise.all([
            fetchAlerts().catch(e => console.error('Alerts load failed:', e)),
            fetchActiveUsers().catch(e => console.error('Users load failed:', e)),
            fetchMarketData().catch(e => console.error('Market data load failed:', e))
        ]);
        
        // Set up real-time market updates
        setInterval(() => {
            console.log('🔄 Auto-refresh via PROXY...');
            fetchMarketData().catch(e => console.error('Market refresh failed:', e));
        }, 30000);
        
        console.log('✅ BULLETPROOF Dashboard fully loaded');
        
    } catch (error) {
        console.error('🚨 CRITICAL: Dashboard initialization failed:', error);
        showError('Dashboard initialization failed: ' + error.message);
    }
});

// Check if user requires subscription selection
function requiresSubscriptionSelection() {
    if (!currentUser) return false;
    
    // Admins can always access
    if (currentUser.isAdmin) return false;
    
    // Check if user is on FREE tier and has never had a subscription
    const hasNeverSubscribed = !currentUser.subscriptionId && 
                              !currentUser.subscriptionStatus && 
                              currentUser.tier === 'FREE';
    
    return hasNeverSubscribed;
}

// Show subscription required message
function showSubscriptionRequiredMessage() {
    // Hide all dashboard content
    if (alertsContainer) alertsContainer.innerHTML = '';
    if (activeUsers) activeUsers.innerHTML = '';
    if (marketData) marketData.innerHTML = '';
    
    // Show subscription required overlay
    const subscriptionOverlay = createSubscriptionOverlay();
    document.body.appendChild(subscriptionOverlay);
}

// Create subscription required overlay
function createSubscriptionOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    overlay.id = 'subscriptionOverlay';
    
    overlay.innerHTML = `
        <div class="bg-white rounded-lg p-8 max-w-md mx-4 text-center shadow-2xl">
            <div class="text-6xl mb-4">🔒</div>
            <h2 class="text-2xl font-bold text-gray-900 mb-4">
                Subscription Required
            </h2>
            <p class="text-gray-600 mb-6">
                To access the trading dashboard and all its features, please select a subscription plan.
            </p>
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p class="text-sm text-blue-800">
                    <strong>What you'll get:</strong><br>
                    • Full group access<br>
                    • Unlimited live alerts<br>
                    • Real-time market data<br>
                    • Direct trader access
                </p>
            </div>
            <div class="flex gap-3">
                <button onclick="redirectToSubscription()" class="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                    Choose Plan
                </button>
                <button onclick="logout()" class="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors">
                    Logout
                </button>
            </div>
            <p class="text-xs text-gray-500 mt-4">
                Redirecting to subscription page in <span id="countdown">3</span> seconds...
            </p>
        </div>
    `;
    
    // Start countdown
    let countdown = 3;
    const countdownElement = overlay.querySelector('#countdown');
    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdownElement) {
            countdownElement.textContent = countdown;
        }
        if (countdown <= 0) {
            clearInterval(countdownInterval);
        }
    }, 1000);
    
    return overlay;
}

// Redirect to subscription page
function redirectToSubscription() {
    window.location.href = 'subscription.html';
}

// Check for payment success
function checkPaymentSuccess() {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId) {
        showSuccess('🎉 Subscription activated! Welcome to full access!');
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Load user profile
async function loadUserProfile() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('No token found');
            return;
        }

        const response = await apiCall('/auth/profile');
        currentUser = response;
        
        // Update UI
        if (userAvatar) userAvatar.src = currentUser.avatar;
        if (username) username.textContent = currentUser.username;
        if (userTier) {
            userTier.textContent = currentUser.tier === 'FREE' ? 'FREE TIER' : currentUser.tier;
            userTier.className = `text-xs ${getTierStyles(currentUser.tier)}`;
        }
        
        console.log('👤 User loaded via PROXY:', currentUser);
        
    } catch (error) {
        console.error('Error loading user profile via PROXY:', error);
        localStorage.removeItem('token');
        throw error;
    }
}

// Get tier styling
function getTierStyles(tier) {
    switch (tier) {
        case 'ADMIN':
            return 'text-red-600';
        case 'MONTHLY':
            return 'text-green-600';
        case 'WEEKLY':
            return 'text-blue-600';
        default:
            return 'text-gray-500';
    }
}

// Update UI based on user tier
function updateUIForUserTier() {
    if (!currentUser) return;
    
    const isPaidUser = currentUser.tier === 'WEEKLY' || currentUser.tier === 'MONTHLY';
    
    // Show/hide upgrade banner
    if (currentUser.tier === 'FREE') {
        if (upgradeBanner) upgradeBanner.classList.remove('hidden');
    }
    
    // Show admin panel for admins
    if (currentUser.isAdmin) {
        if (adminPanel) adminPanel.classList.remove('hidden');
    }
    
    // Show limited badge for free users
    if (!isPaidUser && !currentUser.isAdmin) {
        if (marketLimitedBadge) marketLimitedBadge.classList.remove('hidden');
    }
}

// 🛡️ BULLETPROOF Socket.IO initialization
function initializeSocket() {
    if (!currentUser) return;
    
    try {
        // ❌ REMOVED: Direct Railway connection - Socket.IO not needed for basic functionality
        console.log('🔄 Socket.IO disabled - using polling via PROXY instead');
        
        // Set up polling instead of Socket.IO for bulletproof operation
        setInterval(() => {
            if (currentUser) {
                console.log('🔄 Polling for new data via PROXY...');
                fetchAlerts().catch(e => console.error('Poll alerts failed:', e));
                fetchActiveUsers().catch(e => console.error('Poll users failed:', e));
            }
        }, 10000); // Poll every 10 seconds
        
    } catch (error) {
        console.error('❌ Socket initialization failed, using polling:', error);
    }
}

// 🛡️ BULLETPROOF: Fetch alerts with comprehensive error handling
async function fetchAlerts() {
    try {
        console.log('📡 Fetching alerts via BULLETPROOF PROXY...');
        
        if (loadingAlerts) loadingAlerts.style.display = 'block';
        
        const alertsResponse = await apiCall(`/alerts?type=${currentFilter}`);
        
        console.log('🔍 Raw alerts response:', alertsResponse);
        console.log('🔍 Response type:', typeof alertsResponse);
        
        // 🛡️ BULLETPROOF: Handle EVERY possible response format
        let newAlerts = [];
        
        if (Array.isArray(alertsResponse)) {
            // Format 1: Direct array
            newAlerts = alertsResponse;
            console.log('✅ Format 1: Direct array with', newAlerts.length, 'alerts');
        } else if (alertsResponse && typeof alertsResponse === 'object') {
            if (Array.isArray(alertsResponse.alerts)) {
                // Format 2: Object with alerts property
                newAlerts = alertsResponse.alerts;
                console.log('✅ Format 2: Object.alerts with', newAlerts.length, 'alerts');
            } else if (Array.isArray(alertsResponse.data)) {
                // Format 3: Object with data property
                newAlerts = alertsResponse.data;
                console.log('✅ Format 3: Object.data with', newAlerts.length, 'alerts');
            } else {
                // Format 4: Unknown object
                console.warn('⚠️ Unknown object format:', alertsResponse);
                newAlerts = [];
            }
        } else {
            // Format 5: Completely unexpected
            console.warn('⚠️ Completely unexpected response:', alertsResponse);
            newAlerts = [];
        }
        
        // 🛡️ TRIPLE SAFETY CHECK
        if (!Array.isArray(newAlerts)) {
            console.error('🚨 CRITICAL: Processed alerts is not an array!', typeof newAlerts, newAlerts);
            newAlerts = [];
        }
        
        // 🛡️ BULLETPROOF ASSIGNMENT
        allAlerts = ensureArray(newAlerts, 'allAlerts after fetch');
        
        console.log('✅ BULLETPROOF Alerts loaded via PROXY:', allAlerts.length);
        displayAlerts();
        
    } catch (error) {
        console.error('❌ Error fetching alerts via PROXY:', error);
        allAlerts = ensureArray([], 'allAlerts on error'); // BULLETPROOF: Always ensure empty array
        showError('Failed to fetch alerts via proxy: ' + error.message);
        if (alertsContainer) {
            alertsContainer.innerHTML = `
                <div class="text-center py-8 text-red-500">
                    <p>❌ Failed to load alerts via PHP Proxy</p>
                    <p class="text-sm mt-2">Error: ${error.message}</p>
                    <button onclick="fetchAlerts()" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
                        🔄 Retry
                    </button>
                </div>
            `;
        }
    } finally {
        if (loadingAlerts) loadingAlerts.style.display = 'none';
    }
}

// 🛡️ BULLETPROOF: Display alerts with comprehensive safety checks
function displayAlerts() {
    if (!alertsContainer) {
        console.warn('⚠️ alertsContainer element not found');
        return;
    }
    
    // 🛡️ BULLETPROOF: Ensure allAlerts is always an array
    allAlerts = ensureArray(allAlerts, 'allAlerts in displayAlerts');
    
    const isPaidUser = currentUser && (currentUser.tier === 'WEEKLY' || currentUser.tier === 'MONTHLY' || currentUser.isAdmin);
    
    console.log('🎨 Displaying alerts:', {
        total: allAlerts.length,
        isPaidUser,
        userTier: currentUser?.tier
    });
    
    if (allAlerts.length === 0) {
        alertsContainer.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <div class="text-4xl mb-4">📭</div>
                <h3 class="text-lg font-medium mb-2">No alerts found</h3>
                <p class="text-sm">Check back later for trading signals and updates.</p>
                ${currentUser?.isAdmin ? '<p class="text-sm mt-2">Create one using the admin panel above!</p>' : ''}
                <div class="mt-4 text-xs text-gray-400">
                    🛡️ Via PHP Proxy | Array: ${Array.isArray(allAlerts) ? 'Valid' : 'Invalid'} | 
                    Count: ${allAlerts.length} | Type: ${typeof allAlerts}
                </div>
            </div>
        `;
        return;
    }
    
    // Show limited alerts for free users
    const displayAlerts = isPaidUser ? allAlerts : allAlerts.slice(0, 3);
    
    console.log('🎨 Rendering', displayAlerts.length, 'of', allAlerts.length, 'alerts');
    
    try {
        alertsContainer.innerHTML = displayAlerts.map((alert, index) => {
            // 🛡️ BULLETPROOF: Validate each alert
            if (!alert || typeof alert !== 'object') {
                console.warn(`⚠️ Invalid alert at index ${index}:`, alert);
                return `
                    <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                        <p class="text-red-600">⚠️ Invalid alert data at position ${index + 1}</p>
                    </div>
                `;
            }
            
            return `
                <div class="bg-white rounded-lg shadow-sm border-l-4 p-6 ${getPriorityBorder(alert.priority)}">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="flex items-center gap-3 mb-2">
                                <span class="text-xl">${getAlertIcon(alert.type)}</span>
                                <div>
                                    <h3 class="font-bold text-gray-900">${alert.title || 'No Title'}</h3>
                                    ${alert.botName ? `<p class="text-sm text-blue-600 font-medium">${alert.botName}</p>` : ''}
                                </div>
                            </div>
                            
                            <p class="text-gray-700 mb-3">${alert.message || 'No message'}</p>
                            
                            ${alert.pnl ? `
                                <div class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getPnlStyles(alert.pnl)}">
                                    ${alert.pnl.includes('+') ? '📈' : '📉'}
                                    ${alert.pnl}
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="text-right ml-4">
                            <div class="flex items-center gap-2">
                                <span>🕐</span>
                                <span class="text-sm text-gray-500">${formatTimeAgo(alert.createdAt)}</span>
                                ${currentUser?.isAdmin ? `
                                    <button onclick="deleteAlert('${alert._id || alert.id}')" class="p-1 text-red-400 hover:text-red-600" title="Delete alert">
                                        🗑️
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="mt-2 text-xs text-gray-400">
                        🛡️ ID: ${alert._id || alert.id || 'No ID'} | Via PROXY
                    </div>
                </div>
            `;
        }).join('');
        
        console.log('✅ Alerts rendered successfully');
        
    } catch (renderError) {
        console.error('🚨 CRITICAL: Error rendering alerts:', renderError);
        alertsContainer.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 class="text-red-800 font-bold mb-2">🚨 Rendering Error</h3>
                <p class="text-red-600 mb-2">Failed to display alerts</p>
                <p class="text-sm text-red-500">Error: ${renderError.message}</p>
                <button onclick="fetchAlerts()" class="mt-3 px-4 py-2 bg-red-500 text-white rounded">
                    🔄 Reload Alerts
                </button>
            </div>
        `;
    }
    
    // Show paywall for free users if there are more alerts
    if (!isPaidUser && allAlerts.length > 3 && blurredAlerts && alertsPaywall) {
        try {
            const previewAlerts = allAlerts.slice(3, 6);
            blurredAlerts.innerHTML = previewAlerts.map(alert => `
                <div class="bg-white rounded-lg shadow-sm border-l-4 border-gray-300 p-6 mb-4">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="flex items-center gap-3 mb-2">
                                <span class="text-xl">🔔</span>
                                <h3 class="font-bold text-gray-900">${alert?.title || 'No Title'}</h3>
                            </div>
                            <p class="text-gray-700">${alert?.message || 'No message'}</p>
                        </div>
                    </div>
                </div>
            `).join('');
            
            alertsPaywall.classList.remove('hidden');
        } catch (paywallError) {
            console.error('❌ Paywall rendering error:', paywallError);
        }
    } else if (alertsPaywall) {
        alertsPaywall.classList.add('hidden');
    }
}

// Get alert priority border
function getPriorityBorder(priority) {
    switch (priority) {
        case 'HIGH': return 'border-red-500';
        case 'MEDIUM': return 'border-yellow-500';
        default: return 'border-gray-300';
    }
}

// Get alert icon
function getAlertIcon(type) {
    switch (type) {
        case 'BOT_SIGNAL': return '🤖';
        case 'MARKET_UPDATE': return '📊';
        case 'NEWS': return '📰';
        default: return '🔔';
    }
}

// Get P&L styles
function getPnlStyles(pnl) {
    if (!pnl) return 'bg-gray-100 text-gray-800';
    return pnl.includes('+') ? 
        'bg-green-100 text-green-800' : 
        'bg-red-100 text-red-800';
}

// Format time ago
function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Unknown time';
    try {
        const diff = Date.now() - new Date(timestamp).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        return `${Math.floor(minutes / 60)}h ago`;
    } catch (error) {
        console.error('Error formatting timestamp:', timestamp, error);
        return 'Invalid time';
    }
}

// Filter alerts
function filterAlerts(type) {
    currentFilter = type;
    
    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset && btn.dataset.filter === type) {
            btn.className = 'filter-btn px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500 text-white';
        } else {
            btn.className = 'filter-btn px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300';
        }
    });
    
    fetchAlerts().catch(e => console.error('Filter alerts failed:', e));
}

// 🛡️ BULLETPROOF: Fetch active users with comprehensive error handling
async function fetchActiveUsers() {
    try {
        console.log('📡 Fetching active users via BULLETPROOF PROXY...');
        
        const usersResponse = await apiCall('/users/active');
        
        console.log('🔍 Raw users response:', usersResponse);
        
        // 🛡️ BULLETPROOF: Handle different response formats
        let newUsers = [];
        
        if (Array.isArray(usersResponse)) {
            newUsers = usersResponse;
            console.log('✅ Users format: Direct array with', newUsers.length, 'users');
        } else if (usersResponse && typeof usersResponse === 'object') {
            if (Array.isArray(usersResponse.users)) {
                newUsers = usersResponse.users;
                console.log('✅ Users format: Object.users with', newUsers.length, 'users');
            } else if (Array.isArray(usersResponse.data)) {
                newUsers = usersResponse.data;
                console.log('✅ Users format: Object.data with', newUsers.length, 'users');
            } else {
                console.warn('⚠️ Unknown users object format:', usersResponse);
                newUsers = [];
            }
        } else {
            console.warn('⚠️ Unexpected users response:', usersResponse);
            newUsers = [];
        }
        
        // 🛡️ BULLETPROOF ASSIGNMENT
        allUsers = ensureArray(newUsers, 'allUsers after fetch');
        
        console.log('✅ BULLETPROOF Active users loaded via PROXY:', allUsers.length);
        displayActiveUsers();
        
    } catch (error) {
        console.error('❌ Error fetching active users via PROXY:', error);
        allUsers = ensureArray([], 'allUsers on error');
        if (activeUsers) {
            activeUsers.innerHTML = `
                <div class="text-center py-4 text-red-500">
                    <p>❌ Failed to load users</p>
                    <button onclick="fetchActiveUsers()" class="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm">
                        🔄 Retry
                    </button>
                </div>
            `;
        }
    }
}

// 🛡️ BULLETPROOF: Display active users
function displayActiveUsers() {
    if (!activeUsers || !userCount) {
        console.warn('⚠️ activeUsers or userCount elements not found');
        return;
    }
    
    // 🛡️ BULLETPROOF: Ensure allUsers is always an array
    allUsers = ensureArray(allUsers, 'allUsers in displayActiveUsers');
    
    const isPaidUser = currentUser && (currentUser.tier === 'WEEKLY' || currentUser.tier === 'MONTHLY' || currentUser.isAdmin);
    const displayUsers = isPaidUser ? allUsers : allUsers.slice(0, 3);
    
    userCount.textContent = allUsers.length;
    
    console.log('🎨 Displaying users:', {
        total: allUsers.length,
        showing: displayUsers.length,
        isPaidUser
    });
    
    if (displayUsers.length === 0) {
        activeUsers.innerHTML = `
            <div class="text-center py-4 text-gray-500">
                <div class="text-2xl mb-2">👥</div>
                <p>No active users found</p>
                <div class="mt-2 text-xs text-gray-400">
                    🛡️ Via PHP Proxy | Array: ${Array.isArray(allUsers) ? 'Valid' : 'Invalid'} | 
                    Count: ${allUsers.length}
                </div>
            </div>
        `;
        return;
    }
    
    try {
        activeUsers.innerHTML = displayUsers.map((user, index) => {
            // 🛡️ BULLETPROOF: Validate each user
            if (!user || typeof user !== 'object') {
                console.warn(`⚠️ Invalid user at index ${index}:`, user);
                return `<div class="p-2 text-red-500 text-sm">⚠️ Invalid user data</div>`;
            }
            
            return `
                <div class="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                    <div class="relative">
                        <img src="${user.avatar || 'https://ui-avatars.com/api/?background=22c55e&color=fff&name=User'}" 
                             alt="${user.username || 'User'}" 
                             class="w-10 h-10 rounded-full"
                             onerror="this.src='https://ui-avatars.com/api/?background=22c55e&color=fff&name=User'">
                        <div class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white bg-green-500"></div>
                    </div>
                    <div class="flex-1">
                        <p class="font-medium text-gray-900 text-sm">${user.username || 'Unknown User'}</p>
                        <span class="text-xs px-2 py-0.5 rounded ${getTierBadgeStyles(user.tier)}">
                            ${user.tier || 'FREE'}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
        
        console.log('✅ Users rendered successfully');
        
    } catch (renderError) {
        console.error('🚨 CRITICAL: Error rendering users:', renderError);
        activeUsers.innerHTML = `
            <div class="text-center py-4 text-red-500">
                <p>🚨 Error rendering users</p>
                <p class="text-xs">${renderError.message}</p>
            </div>
        `;
    }
    
    // Show hidden user count for free users
    if (!isPaidUser && allUsers.length > 3 && hiddenUserCount && usersPaywall) {
        try {
            hiddenUserCount.textContent = allUsers.length - 3;
            usersPaywall.classList.remove('hidden');
        } catch (error) {
            console.error('❌ Users paywall error:', error);
        }
    } else if (usersPaywall) {
        usersPaywall.classList.add('hidden');
    }
}

// Get tier badge styles
function getTierBadgeStyles(tier) {
    switch (tier) {
        case 'MONTHLY': return 'bg-green-100 text-green-800';
        case 'WEEKLY': return 'bg-blue-100 text-blue-800';
        case 'ADMIN': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

// 🛡️ BULLETPROOF: Fetch market data
async function fetchMarketData() {
    const isPaidUser = currentUser && (currentUser.tier === 'WEEKLY' || currentUser.tier === 'MONTHLY' || currentUser.isAdmin);
    
    if (!isPaidUser) {
        if (marketData) marketData.classList.add('hidden');
        if (marketPaywall) marketPaywall.classList.remove('hidden');
        return;
    }
    
    try {
        console.log('📡 Fetching market data via PROXY...');
        
        const data = await apiCall('/market/data');
        
        console.log('📈 Market data received:', data);
        
        if (marketData && data && typeof data === 'object') {
            const entries = Object.entries(data);
            if (entries.length === 0) {
                marketData.innerHTML = '<div class="text-center py-4 text-gray-500">No market data available</div>';
            } else {
                marketData.innerHTML = entries.map(([symbol, info]) => {
                    if (!info || typeof info !== 'object') {
                        return `
                            <div class="flex justify-between items-center p-2 bg-red-50">
                                <span class="font-medium text-red-600">${symbol}</span>
                                <span class="text-red-500 text-sm">Invalid data</span>
                            </div>
                        `;
                    }
                    
                    return `
                        <div class="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                            <span class="font-medium text-gray-900">${symbol}</span>
                            <div class="text-right">
                                <div class="font-bold text-gray-900">
                                    $${typeof info.price === 'number' ? info.price.toFixed(2) : 'N/A'}
                                </div>
                                <div class="text-xs ${(info.changePercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}">
                                    ${(info.changePercent || 0) >= 0 ? '+' : ''}${typeof info.changePercent === 'number' ? info.changePercent.toFixed(2) : '0.00'}%
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
            
            marketData.classList.remove('hidden');
        }
        if (marketPaywall) marketPaywall.classList.add('hidden');
        
        console.log('✅ Market data displayed successfully');
        
    } catch (error) {
        console.error('❌ Error fetching market data via PROXY:', error);
        if (marketData) {
            marketData.innerHTML = `
                <div class="text-center py-4 text-red-500">
                    <p>❌ Failed to load market data</p>
                    <button onclick="fetchMarketData()" class="mt-2 px-3 py-1 bg-red-500 text-white rounded text-sm">
                        🔄 Retry
                    </button>
                </div>
            `;
        }
        
        if (error.message && error.message.includes('Subscription required')) {
            if (marketData) marketData.classList.add('hidden');
            if (marketPaywall) marketPaywall.classList.remove('hidden');
        }
    }
}

// Admin functions
function toggleAdminPanel() {
    if (adminPanelSection) {
        adminPanelSection.classList.toggle('hidden');
    }
}

async function createAlert() {
    if (!currentUser || !currentUser.isAdmin) {
        showError('Admin access required');
        return;
    }
    
    const createBtn = document.getElementById('createAlertText');
    const originalText = createBtn ? createBtn.textContent : '';
    
    try {
        if (createBtn) createBtn.textContent = 'Creating...';
        
        const alertData = {
            title: document.getElementById('alertTitle')?.value || '',
            message: document.getElementById('alertMessage')?.value || '',
            type: document.getElementById('alertType')?.value || 'NEWS',
            priority: document.getElementById('alertPriority')?.value || 'MEDIUM',
            botName: document.getElementById('alertBotName')?.value || null,
            pnl: document.getElementById('alertPnl')?.value || null
        };
        
        if (!alertData.title || !alertData.message) {
            showError('Title and message are required');
            return;
        }
        
        console.log('📝 Creating alert via PROXY:', alertData);
        
        await apiCall('/alerts', {
            method: 'POST',
            body: JSON.stringify(alertData)
        });
        
        // Clear form
        const fields = ['alertTitle', 'alertMessage', 'alertBotName', 'alertPnl'];
        fields.forEach(field => {
            const element = document.getElementById(field);
            if (element) element.value = '';
        });
        
        showSuccess('Alert created successfully via PROXY!');
        
        // Refresh alerts
        setTimeout(() => {
            fetchAlerts().catch(e => console.error('Refresh after create failed:', e));
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error creating alert via PROXY:', error);
        showError('Failed to create alert: ' + error.message);
    } finally {
        if (createBtn) createBtn.textContent = originalText;
    }
}

async function deleteAlert(alertId) {
    if (!currentUser || !currentUser.isAdmin) {
        showError('Admin access required');
        return;
    }
    
    if (!alertId) {
        showError('Invalid alert ID');
        return;
    }
    
    try {
        console.log('🗑️ Deleting alert via PROXY:', alertId);
        
        await apiCall(`/alerts/${alertId}`, { method: 'DELETE' });
        
        // 🛡️ BULLETPROOF: Remove from local array safely
        if (Array.isArray(allAlerts)) {
            allAlerts = allAlerts.filter(alert => alert && (alert._id !== alertId && alert.id !== alertId));
            console.log('✅ Alert removed from local array, remaining:', allAlerts.length);
            displayAlerts();
        }
        
        showSuccess('Alert deleted successfully via PROXY!');
        
    } catch (error) {
        console.error('❌ Error deleting alert via PROXY:', error);
        showError('Failed to delete alert: ' + error.message);
    }
}

// 🛡️ BULLETPROOF: API Call function using PHP Proxy ONLY
async function apiCall(endpoint, options = {}) {
    try {
        console.log(`📡 BULLETPROOF API call via PROXY: ${options.method || 'GET'} ${endpoint}`);
        
        const response = await proxyFetch(endpoint, options);
        
        if (!response) {
            throw new Error('No response from proxy');
        }
        
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
            }
            throw new Error(errorData.error || errorData.message || 'API Error');
        }

        const data = await response.json();
        console.log(`✅ BULLETPROOF API call successful: ${endpoint}`, typeof data);
        return data;
        
    } catch (error) {
        console.error(`❌ BULLETPROOF API call failed: ${endpoint}`, error);
        throw error;
    }
}

// UI Helper Functions
function showSuccess(message) {
    console.log('✅ SUCCESS:', message);
    if (successText && successMessage) {
        successText.textContent = message;
        successMessage.classList.remove('hidden');
        setTimeout(() => {
            successMessage.classList.add('hidden');
        }, 5000);
    }
}

function showError(message) {
    console.error('❌ ERROR:', message);
    if (errorText && errorMessage) {
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
        setTimeout(() => {
            errorMessage.classList.add('hidden');
        }, 5000);
    }
}

function hideError() {
    if (errorMessage) {
        errorMessage.classList.add('hidden');
    }
}

function logout() {
    console.log('👋 Logging out...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (socket) {
        socket.disconnect();
    }
    window.location.href = 'index.html';
}

// 🛡️ BULLETPROOF Test functions for browser console
window.testProxy = async () => {
    console.log('🧪 Testing BULLETPROOF PHP proxy...');
    
    try {
        console.log('🔍 Testing connection...');
        const result = await apiCall('/test');
        console.log('✅ Proxy test successful:', result);
        alert('✅ BULLETPROOF PHP Proxy is working!\n\n' + JSON.stringify(result, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Proxy test failed:', error);
        alert('❌ BULLETPROOF Proxy test failed:\n' + error.message);
        return false;
    }
};

window.testProxyLogin = async () => {
    console.log('🧪 Testing login via BULLETPROOF proxy...');
    
    try {
        const result = await apiCall('/auth/profile');
        console.log('✅ Profile test successful:', result);
        alert('✅ BULLETPROOF Login/Profile works!\n\n' + JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error('❌ Profile test failed:', error);
        alert('❌ BULLETPROOF Profile test failed:\n' + error.message);
        return null;
    }
};

window.checkArrays = () => {
    console.log('🔍 BULLETPROOF Array Check:');
    console.log('allAlerts:', {
        type: typeof allAlerts,
        isArray: Array.isArray(allAlerts),
        length: allAlerts?.length,
        sample: allAlerts?.[0]
    });
    console.log('allUsers:', {
        type: typeof allUsers,
        isArray: Array.isArray(allUsers),
        length: allUsers?.length,
        sample: allUsers?.[0]
    });
    
    alert(`🔍 BULLETPROOF Array Status:
    
Alerts: ${Array.isArray(allAlerts) ? `✅ Array[${allAlerts.length}]` : `❌ ${typeof allAlerts}`}
Users: ${Array.isArray(allUsers) ? `✅ Array[${allUsers.length}]` : `❌ ${typeof allUsers}`}
    
Check console for detailed info.`);
};

window.forceRefresh = async () => {
    console.log('🔄 BULLETPROOF Force refresh...');
    
    // Reset arrays
    allAlerts = [];
    allUsers = [];
    
    try {
        await Promise.all([
            fetchAlerts().catch(e => console.error('Force refresh alerts failed:', e)),
            fetchActiveUsers().catch(e => console.error('Force refresh users failed:', e)),
            fetchMarketData().catch(e => console.error('Force refresh market failed:', e))
        ]);
        
        alert('✅ BULLETPROOF Force refresh completed!');
    } catch (error) {
        console.error('❌ Force refresh failed:', error);
        alert('❌ Force refresh failed: ' + error.message);
    }
};

// Make functions globally available
window.filterAlerts = filterAlerts;
window.toggleAdminPanel = toggleAdminPanel;
window.createAlert = createAlert;
window.deleteAlert = deleteAlert;
window.hideError = hideError;
window.logout = logout;
window.redirectToSubscription = redirectToSubscription;
window.fetchAlerts = fetchAlerts;
window.fetchActiveUsers = fetchActiveUsers;
window.fetchMarketData = fetchMarketData;

console.log('🛡️ BULLETPROOF Production Trading Dashboard.js loaded with PHP Proxy ONLY ✅');
console.log('🧪 Available test functions:');
console.log('  - testProxy() - Test PHP proxy connection');
console.log('  - testProxyLogin() - Test login/profile via proxy');  
console.log('  - checkArrays() - Check array states');
console.log('  - forceRefresh() - Force refresh all data');
console.log('📡 ALL API calls now go through PHP Proxy ONLY - no more CORS issues!');
