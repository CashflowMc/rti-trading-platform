import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Error Boundary for catching component errors
 */
class DashboardErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Dashboard Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="dashboard-error">
          <h2>Dashboard Error</h2>
          <p>{this.state.error.message}</p>
          <button onClick={() => window.location.reload()}>Reload Dashboard</button>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Main Dashboard Component
 */
const Dashboard = ({ initialAlerts = [] }) => {
  // State initialization with proper defaults
  const [alerts, setAlerts] = useState(
    Array.isArray(initialAlerts) ? initialAlerts : []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  /**
   * Safely fetch alerts from API
   */
  const fetchAlerts = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/alerts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      // Validate and sanitize alerts data
      const validatedAlerts = validateAlerts(data.alerts);
      setAlerts(validatedAlerts);
      setLastUpdated(new Date());
      
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      setError(err.message);
      setAlerts([]); // Reset to empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Validate and sanitize alerts data
   */
  const validateAlerts = (alertsData) => {
    if (!Array.isArray(alertsData)) {
      console.warn('Alerts data is not an array:', alertsData);
      return [];
    }

    return alertsData.filter(alert => (
      alert &&
      typeof alert === 'object' &&
      alert.id &&
      alert.title &&
      alert.priority
    )).map(alert => ({
      id: alert.id,
      title: alert.title || 'Untitled Alert',
      message: alert.message || '',
      priority: alert.priority || 'medium',
      timestamp: alert.timestamp || new Date().toISOString()
    }));
  };

  /**
   * Safe filtering of alerts
   */
  const getFilteredAlerts = (priority) => {
    if (!Array.isArray(alerts)) return [];
    return alerts.filter(alert => alert.priority === priority);
  };

  // Load alerts on component mount
  useEffect(() => {
    fetchAlerts();
    
    // Set up refresh interval (5 minutes)
    const interval = setInterval(fetchAlerts, 300000);
    return () => clearInterval(interval);
  }, []);

  // Get filtered alerts
  const highPriorityAlerts = getFilteredAlerts('high');
  const mediumPriorityAlerts = getFilteredAlerts('medium');
  const lowPriorityAlerts = getFilteredAlerts('low');

  // Render loading state
  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading alerts...</p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="dashboard-error">
        <h3>Error Loading Alerts</h3>
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
        {lastUpdated && (
          <p className="last-updated">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </header>

      <section className="alerts-section">
        <h2>Alerts</h2>
        
        {alerts.length === 0 ? (
          <p className="no-alerts">No alerts found</p>
        ) : (
          <>
            {highPriorityAlerts.length > 0 && (
              <AlertGroup priority="high" alerts={highPriorityAlerts} />
            )}
            {mediumPriorityAlerts.length > 0 && (
              <AlertGroup priority="medium" alerts={mediumPriorityAlerts} />
            )}
            {lowPriorityAlerts.length > 0 && (
              <AlertGroup priority="low" alerts={lowPriorityAlerts} />
            )}
          </>
        )}
      </section>

      <button 
        className="refresh-button"
        onClick={fetchAlerts}
        disabled={isLoading}
      >
        {isLoading ? 'Refreshing...' : 'Refresh Alerts'}
      </button>
    </div>
  );
};

/**
 * Alert Group Subcomponent
 */
const AlertGroup = ({ priority, alerts }) => {
  const priorityClass = `alert-priority-${priority}`;
  
  return (
    <div className={`alert-group ${priorityClass}`}>
      <h3>{priority.toUpperCase()} Priority Alerts</h3>
      <ul>
        {alerts.map(alert => (
          <li key={alert.id} className="alert-item">
            <h4>{alert.title}</h4>
            <p>{alert.message}</p>
            <time>{new Date(alert.timestamp).toLocaleString()}</time>
          </li>
        ))}
      </ul>
    </div>
  );
};

// PropTypes validation
Dashboard.propTypes = {
  initialAlerts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string,
      message: PropTypes.string,
      priority: PropTypes.oneOf(['high', 'medium', 'low']),
      timestamp: PropTypes.string
    })
  )
};

AlertGroup.propTypes = {
  priority: PropTypes.oneOf(['high', 'medium', 'low']).isRequired,
  alerts: PropTypes.array.isRequired
};

// Wrap Dashboard with Error Boundary
export default function SafeDashboard(props) {
  return (
    <DashboardErrorBoundary>
      <Dashboard {...props} />
    </DashboardErrorBoundary>
  );
}
