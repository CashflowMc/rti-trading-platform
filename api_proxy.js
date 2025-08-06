// 🚀 RTi Cashflowops - Complete Frontend Proxy with Design Studio
// Location: api_proxy.js (root directory)
// This version includes Design Studio integration for Railway

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for handling FormData
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow images and common web files
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'), false);
        }
    }
});

// Middleware
app.use(cors({
    origin: [
        'https://cashflowops.pro',
        'https://*.railway.app',
        'http://localhost:3000',
        'http://localhost:4000',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        process.env.FRONTEND_URL
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Railway API base URL
const RAILWAY_API_BASE = process.env.BACKEND_URL || 'https://rti-trading-backend-production.up.railway.app/api';

// Debug logging
const debugLog = (message, data = null) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [RTi Proxy] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

// ===== STATIC FILE SERVING =====

// Serve main dashboard
app.get('/', (req, res) => {
    debugLog('🏠 Serving main dashboard');
    if (fs.existsSync(path.join(__dirname, 'dashboard.html'))) {
        res.sendFile(path.join(__dirname, 'dashboard.html'));
    } else if (fs.existsSync(path.join(__dirname, 'index.html'))) {
        res.sendFile(path.join(__dirname, 'index.html'));
    } else {
        res.status(404).send(`
            <h1>🚀 RTi Cashflowops Proxy</h1>
            <p>Main dashboard file not found. Please ensure dashboard.html or index.html exists.</p>
            <p><a href="/design-studio">🎨 Access Design Studio</a></p>
            <p><a href="/health">❤️ Health Check</a></p>
        `);
    }
});

// Serve Design Studio
app.get('/design-studio', (req, res) => {
    debugLog('🎨 Serving Design Studio');
    if (fs.existsSync(path.join(__dirname, 'design-studio.html'))) {
        res.sendFile(path.join(__dirname, 'design-studio.html'));
    } else {
        res.status(404).send(`
            <h1>🎨 RTi Design Studio</h1>
            <p>Design Studio not found. Please create design-studio.html file.</p>
            <p><a href="/">🏠 Back to Dashboard</a></p>
        `);
    }
});

// Serve dashboard (alternative route)
app.get('/dashboard', (req, res) => {
    debugLog('📊 Serving dashboard page');
    if (fs.existsSync(path.join(__dirname, 'dashboard.html'))) {
        res.sendFile(path.join(__dirname, 'dashboard.html'));
    } else {
        res.redirect('/');
    }
});

// Serve subscription page
app.get('/subscription', (req, res) => {
    debugLog('💳 Serving subscription page');
    if (fs.existsSync(path.join(__dirname, 'subscription.html'))) {
        res.sendFile(path.join(__dirname, 'subscription.html'));
    } else {
        res.redirect('/#pricing');
    }
});

// ===== MAIN API PROXY =====

// 🛡️ BULLETPROOF Main Proxy endpoint 
app.all('/api_proxy', upload.none(), async (req, res) => {
    try {
        debugLog('🔄 Main API Proxy Request', {
            method: req.method,
            headers: req.headers,
            body: req.body,
            query: req.query
        });

        // Get request parameters from both GET and POST
        const endpoint = req.body.endpoint || req.query.endpoint || '';
        const method = req.body.method || req.query.method || 'GET';
        const data = req.body.data || null;
        const token = req.body.token || req.query.token || req.headers.authorization || null;
        
        debugLog('🔍 Extracted Parameters', { 
            endpoint, 
            method, 
            hasToken: !!token,
            hasData: !!data,
            dataLength: data ? data.length : 0
        });

        // Validate endpoint
        if (!endpoint) {
            debugLog('❌ Missing endpoint parameter');
            return res.status(400).json({
                error: 'Missing endpoint parameter',
                proxy_status: 'missing_endpoint',
                received_params: {
                    endpoint: endpoint || 'MISSING',
                    method: method || 'MISSING',
                    hasToken: !!token,
                    hasData: !!data
                }
            });
        }

        // Build full URL
        const url = RAILWAY_API_BASE + endpoint;
        debugLog('📡 Making request to Railway backend', { url, method });
        
        // Set up fetch options
        const fetchOptions = {
            method: method.toUpperCase(),
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'RTi-Proxy/2.0-DesignStudio',
                'Accept': 'application/json'
            }
        };

        // Add authorization header if token provided
        if (token) {
            fetchOptions.headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            debugLog('🔐 Added auth token');
        }

        // Add body for POST/PUT requests
        if (data && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT')) {
            fetchOptions.body = data;
            debugLog('📦 Added request body', { bodyLength: data.length });
        }

        debugLog('🚀 Sending request to Railway backend...');

        // Make the request to Railway backend
        const response = await fetch(url, fetchOptions);
        const responseData = await response.text();
        
        debugLog('✅ Railway Response Received', { 
            status: response.status, 
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries()),
            responseLength: responseData.length
        });

        // Set the same status code
        res.status(response.status);
        
        // Try to parse as JSON, otherwise send as text
        try {
            const jsonData = JSON.parse(responseData);
            debugLog('📋 Sending JSON response');
            res.json(jsonData);
        } catch (e) {
            debugLog('📋 Sending text response');
            res.send(responseData);
        }

    } catch (error) {
        debugLog('💥 Main Proxy Error', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        res.status(500).json({
            error: 'Proxy error: ' + error.message,
            proxy_status: 'fetch_failed',
            error_type: error.name,
            timestamp: new Date().toISOString()
        });
    }
});

// ===== DESIGN STUDIO API ROUTES =====

// Direct proxy for design studio API calls
app.all('/api/design/*', upload.none(), async (req, res) => {
    try {
        const endpoint = req.path; // Use full path including /api/design
        const method = req.method;
        const token = req.body.token || req.query.token || req.headers.authorization;
        
        debugLog(`🎨 Design Studio API: ${method} ${endpoint}`, { 
            hasToken: !!token,
            hasBody: !!req.body && Object.keys(req.body).length > 0
        });
        
        // Build URL for Railway backend
        const url = RAILWAY_API_BASE.replace('/api', '') + endpoint;
        
        const fetchOptions = {
            method: method.toUpperCase(),
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'RTi-DesignStudio-Proxy/1.0'
            }
        };

        // Add authorization header
        if (token) {
            fetchOptions.headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            debugLog('🔐 Added Design Studio auth token');
        }

        // Add body for non-GET requests
        if (req.body && Object.keys(req.body).length > 0 && method.toUpperCase() !== 'GET') {
            fetchOptions.body = JSON.stringify(req.body);
            debugLog('📦 Added Design Studio request body');
        }

        debugLog(`🚀 Sending Design Studio request to: ${url}`);

        const response = await fetch(url, fetchOptions);
        const responseData = await response.json();
        
        debugLog(`✅ Design Studio Response: ${response.status}`, { 
            ok: response.ok,
            dataKeys: Object.keys(responseData || {})
        });

        res.status(response.status).json(responseData);

    } catch (error) {
        debugLog('💥 Design Studio API Error', {
            message: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            error: 'Design Studio API error: ' + error.message,
            proxy_status: 'design_studio_error',
            timestamp: new Date().toISOString()
        });
    }
});

// ===== FILE UPLOAD HANDLING =====

// Handle asset uploads for Design Studio
app.post('/api/design/upload', upload.single('asset'), async (req, res) => {
    try {
        debugLog('📁 Design Studio file upload request');
        
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // In a real implementation, you'd save to cloud storage
        // For now, we'll simulate successful upload
        const filename = `${Date.now()}-${req.file.originalname}`;
        const assetUrl = `/uploads/${filename}`;
        
        debugLog('✅ File upload simulated', {
            originalName: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            filename: filename
        });

        res.json({
            message: 'File uploaded successfully',
            url: assetUrl,
            filename: filename,
            size: req.file.size,
            type: req.file.mimetype
        });

    } catch (error) {
        debugLog('💥 File upload error', error.message);
        res.status(500).json({
            error: 'File upload failed: ' + error.message
        });
    }
});

// ===== AUTHENTICATION ROUTES =====

// Direct auth proxy (simplified)
app.post('/api/auth/login', upload.none(), async (req, res) => {
    try {
        debugLog('🔐 Direct login attempt', { username: req.body.username });
        
        const response = await fetch(RAILWAY_API_BASE + '/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        
        debugLog(`✅ Login response: ${response.status}`, { success: response.ok });
        
        res.status(response.status).json(data);

    } catch (error) {
        debugLog('💥 Login error', error.message);
        res.status(500).json({ error: 'Login failed: ' + error.message });
    }
});

// ===== UTILITY ENDPOINTS =====

// Health check endpoint  
app.get('/health', (req, res) => {
    debugLog('❤️ Health check requested');
    res.json({ 
        status: 'healthy', 
        proxy: 'RTi Proxy v2.0 with Design Studio',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        features: ['main-dashboard', 'design-studio', 'api-proxy', 'file-uploads'],
        environment: {
            nodeVersion: process.version,
            platform: process.platform,
            memory: process.memoryUsage(),
            backendUrl: RAILWAY_API_BASE
        }
    });
});

// API test endpoint
app.get('/api/test', async (req, res) => {
    try {
        debugLog('🧪 Testing backend connectivity');
        const response = await fetch(RAILWAY_API_BASE.replace('/api', '') + '/api/test');
        const data = await response.json();
        
        res.json({
            proxy_status: 'healthy',
            backend_status: response.ok ? 'healthy' : 'unhealthy',
            backend_response: data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            proxy_status: 'healthy',
            backend_status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Test Design Studio connectivity
app.get('/api/design/test', async (req, res) => {
    try {
        debugLog('🎨 Testing Design Studio backend connectivity');
        const response = await fetch(RAILWAY_API_BASE.replace('/api', '') + '/api/design/config/default', {
            headers: {
                'Authorization': 'Bearer test-token-for-connectivity-check'
            }
        });
        
        res.json({
            design_studio_proxy: 'healthy',
            backend_connectivity: response.status === 401 ? 'healthy (auth required)' : response.ok ? 'healthy' : 'unhealthy',
            status_code: response.status,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.json({
            design_studio_proxy: 'healthy',
            backend_connectivity: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Test endpoint for debugging FormData
app.post('/test', upload.none(), (req, res) => {
    debugLog('🧪 Test endpoint called', {
        body: req.body,
        headers: req.headers,
        method: req.method
    });
    
    res.json({
        message: 'Test successful',
        received: {
            body: req.body,
            headers: req.headers,
            method: req.method
        }
    });
});

// ===== STATIC ASSETS =====

// Serve static files (CSS, JS, images)
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve any other static files
app.use(express.static(__dirname, {
    index: false, // Don't auto-serve index files
    extensions: ['html', 'js', 'css']
}));

// ===== ERROR HANDLING =====

// 404 handler for debugging
app.use('*', (req, res) => {
    debugLog('❓ 404 - Route not found', {
        url: req.originalUrl,
        method: req.method,
        headers: req.headers
    });
    
    res.status(404).json({
        error: 'Route not found',
        url: req.originalUrl,
        method: req.method,
        available_routes: [
            '/ - Main Dashboard',
            '/design-studio - Design Studio',
            '/api_proxy - Main API Proxy', 
            '/api/design/* - Design Studio API',
            '/health - Health Check',
            '/api/test - API Test'
        ]
    });
});

// Error handler
app.use((error, req, res, next) => {
    debugLog('💥 Express Error Handler', {
        message: error.message,
        stack: error.stack
    });
    
    res.status(500).json({
        error: 'Server error: ' + error.message,
        proxy_status: 'server_error',
        timestamp: new Date().toISOString()
    });
});

// ===== SERVER STARTUP =====

// Start server
app.listen(PORT, () => {
    console.log(`🚀 RTi Proxy Server v2.0 with Design Studio running on port ${PORT}`);
    console.log(`🛡️ Main proxy endpoint: /api_proxy`);
    console.log(`🎨 Design Studio: /design-studio`);
    console.log(`📡 Design Studio API: /api/design/*`);
    console.log(`❤️ Health check: /health`);
    console.log(`🧪 Test endpoints: /test, /api/test`);
    console.log(`📡 Target backend: ${RAILWAY_API_BASE}`);
    console.log(`🕒 Started at: ${new Date().toISOString()}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down RTi Proxy gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down RTi Proxy gracefully...');
    process.exit(0);
});

module.exports = app;
