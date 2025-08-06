// 🚀 RTi Cashflowops - Fixed Node.js Proxy for Railway
// Location: api_proxy.js (root directory)
// This version fixes the 400 Bad Request error

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for handling FormData
const upload = multer();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Railway API base URL
const RAILWAY_API_BASE = 'https://rti-trading-backend-production.up.railway.app/api';

// Debug logging
const debugLog = (message, data = null) => {
    console.log(`[RTi Proxy] ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

// 🛡️ BULLETPROOF Proxy endpoint with better error handling
app.all('/api_proxy', upload.none(), async (req, res) => {
    try {
        debugLog('🔄 Incoming Request', {
            method: req.method,
            headers: req.headers,
            body: req.body,
            query: req.query
        });

        // Get request parameters from both GET and POST
        const endpoint = req.body.endpoint || req.query.endpoint || '';
        const method = req.body.method || req.query.method || 'GET';
        const data = req.body.data || null;
        const token = req.body.token || req.query.token || null;
        
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
        debugLog('📡 Making request to Railway', { url, method });
        
        // Set up fetch options
        const fetchOptions = {
            method: method.toUpperCase(),
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'RTi-Proxy/1.0'
            }
        };

        // Add authorization header if token provided
        if (token) {
            fetchOptions.headers['Authorization'] = `Bearer ${token}`;
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
        debugLog('💥 Proxy Error', {
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

// Health check endpoint  
app.get('/health', (req, res) => {
    debugLog('❤️ Health check requested');
    res.json({ 
        status: 'healthy', 
        proxy: 'Node.js RTi Proxy v2.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: {
            nodeVersion: process.version,
            platform: process.platform,
            memory: process.memoryUsage()
        }
    });
});

// Test endpoint to debug FormData
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

// Serve static files (your HTML dashboard)
app.use(express.static('.'));

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
        available_routes: ['/api_proxy', '/health', '/test']
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
        proxy_status: 'server_error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 RTi Proxy Server v2.0 running on port ${PORT}`);
    console.log(`🛡️ Proxy endpoint: /api_proxy`);
    console.log(`❤️ Health check: /health`);
    console.log(`🧪 Test endpoint: /test`);
    console.log(`📡 Target backend: ${RAILWAY_API_BASE}`);
    console.log(`🕒 Started at: ${new Date().toISOString()}`);
});

module.exports = app;
