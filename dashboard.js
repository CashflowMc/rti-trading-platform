import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import io from 'socket.io-client';

const Dashboard = () => {
  // State with proper initialization
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [activeUsers, setActiveUsers] = useState(0);

  // API Configuration
  const API_BASE_URL = 'https://rti-trading-backend-production.up.railway.app/api';
  const SOCKET_URL = 'https://rti-trading-backend-production.up.railway.app';

  // Fetch alerts from API
  const fetchAlerts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/alerts?type=ALL`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      // Validate and set alerts
      if (data && Array.isArray(data.alerts)) {
        setAlerts(data.alerts);
      } else {
        setAlerts([]);
        console.warn('Unexpected alerts format:', data);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      setError(err.message);
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch active users
  const fetchActiveUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/active`);
      const data = await response.json();
      setActiveUsers(data.count || 0);
    } catch (err) {
      console.error('Failed to fetch active users:', err);
    }
  };

  // Initialize socket connection
  const initSocket = () => {
    try {
      const newSocket = io(SOCKET_URL, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        transports: ['websocket']
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
      });

      newSocket.on('connect_error', (err) => {
        console.log('Socket connection error:', err);
      });

      newSocket.on('newAlert', (alert) => {
        setAlerts(prev => [alert, ...prev]);
      });

      setSocket(newSocket);

      return () => newSocket.disconnect();
    } catch (err) {
      console.error('Socket initialization error:', err);
    }
  };

  // Safe filtering of alerts
  const getFilteredAlerts = (type) => {
    return Array.isArray(alerts) ? alerts.filter(alert => alert.type === type) : [];
  };

  // Initial data loading
  useEffect(() => {
    fetchAlerts();
    fetchActiveUsers();
    const cleanup = initSocket();

    return () => {
      if (cleanup) cleanup();
      if (socket) socket.disconnect();
    };
  }, []);

  // Render loading state
  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="dashboard-error">
        <h3>Dashboard Error</h3>
        <p>{error}</p>
        <button onClick={fetchAlerts}>Retry</button>
      </div>
    );
  }

  // Main render
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Cashflow Operations Dashboard</h1>
        <div className="dashboard-stats">
          <span>Active Users: {activeUsers}</span>
          <span>Alerts: {alerts.length}</span>
        </div>
      </header>

      <section className="alerts-section">
        <h2>Alerts Overview</h2>
        
        <div className="alert-filters">
          <button onClick={() => setAlerts(getFilteredAlerts('critical'))}>
            Critical
          </button>
          <button onClick={() => setAlerts(getFilteredAlerts('warning'))}>
            Warnings
          </button>
          <button onClick={() => setAlerts(getFilteredAlerts('info'))}>
            Info
          </button>
          <button onClick={fetchAlerts}>
            Show All
          </button>
        </div>

        <div className="alerts-list">
          {alerts.length === 0 ? (
            <p className="no-alerts">No alerts to display</p>
          ) : (
            alerts.map(alert => (
              <div key={alert.id} className={`alert-item ${alert.type}`}>
                <h3>{alert.title}</h3>
                <p>{alert.message}</p>
                <div className="alert-meta">
                  <span>{new Date(alert.timestamp).toLocaleString()}</span>
                  <span>{alert.type.toUpperCase()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

Dashboard.propTypes = {
  initialAlerts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      message: PropTypes.string,
      type: PropTypes.oneOf(['critical', 'warning', 'info']),
      timestamp: PropTypes.string
    })
  )
};

export default Dashboard;
