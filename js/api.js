/* ── BORDER SURVEILLANCE CENTRALIZED API UTILITY ──────────────────── */
const API_BASE_URL = "http://localhost:8000";

let isBackendOnline = false;

/**
 * Health check to verify FastAPI + MongoDB Atlas status
 */
async function checkHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        if (response.ok) {
            const data = await response.json();
            isBackendOnline = (data.status === 'ok' && data.database === 'connected');
            updateBackendStatusUI(isBackendOnline, data.database_name);
            return data;
        }
    } catch (e) {
        console.warn('FastAPI backend offline or unreachable. Falling back to local session state.');
    }
    isBackendOnline = false;
    updateBackendStatusUI(false);
    return { status: 'offline', database: 'disconnected' };
}

/**
 * Update UI header indicator if present
 */
function updateBackendStatusUI(online, dbName = 'border_surveillance') {
    const el = document.getElementById('backendStatusIndicator');
    if (el) {
        if (online) {
            el.innerHTML = `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--success);margin-right:5px;"></span>Atlas DB Connected (${dbName})`;
            el.style.color = 'var(--success)';
        } else {
            el.innerHTML = `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--warning);margin-right:5px;"></span>Local Prototype Mode`;
            el.style.color = 'var(--warning)';
        }
    }
}

/**
 * Get Alerts from MongoDB Atlas (with local fallback)
 */
async function getAlertsApi(limit = 50, severity = '') {
    try {
        const url = `${API_BASE_URL}/api/alerts?limit=${limit}${severity ? '&severity=' + severity : ''}`;
        const response = await fetch(url);
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.warn('GET /api/alerts failed:', e);
    }
    // Fallback to sessionStorage
    return JSON.parse(sessionStorage.getItem('bordersight_live_alerts') || '[]');
}

/**
 * Post Real Intrusion Alert to MongoDB Atlas
 */
async function createAlertApi(alertData) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/alerts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alertData)
        });
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.warn('POST /api/alerts failed:', e);
    }
    return null;
}

/**
 * Acknowledge Alert
 */
async function acknowledgeAlertApi(alertId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/alerts/${alertId}/acknowledge`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
        });
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.warn(`PATCH /api/alerts/${alertId}/acknowledge failed:`, e);
    }
    return null;
}

/**
 * Get Incidents from MongoDB Atlas
 */
async function getIncidentsApi(limit = 50) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/incidents?limit=${limit}`);
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.warn('GET /api/incidents failed:', e);
    }
    return [];
}

/**
 * Post Real Incident Record to MongoDB Atlas
 */
async function createIncidentApi(incidentData) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/incidents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(incidentData)
        });
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.warn('POST /api/incidents failed:', e);
    }
    return null;
}

/**
 * Get Cameras from MongoDB Atlas
 */
async function getCamerasApi() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/cameras`);
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.warn('GET /api/cameras failed:', e);
    }
    return [];
}

/**
 * Post Real Evidence Metadata to MongoDB Atlas
 */
async function createEvidenceApi(evidenceData) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/evidence`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(evidenceData)
        });
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.warn('POST /api/evidence failed:', e);
    }
    return null;
}

/**
 * Get Analytics Summary Stats from MongoDB Atlas
 */
async function getAnalyticsStatsApi() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/alerts/stats/summary`);
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.warn('GET /api/alerts/stats/summary failed:', e);
    }
    return {
        totalAlerts: 0,
        criticalAlerts: 0,
        highAlerts: 0,
        activeAlerts: 0,
        totalIncidents: 0,
        openIncidents: 0,
        alertsByCamera: {},
        alertsBySeverity: {}
    };
}

/**
 * Get Single Alert by ID
 */
async function getAlertByIdApi(alertId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/alerts/${alertId}`);
        if (response.ok) {
            return await response.json();
        }
    } catch (e) {
        console.warn(`GET /api/alerts/${alertId} failed:`, e);
    }
    return null;
}

// Auto check backend status on load
document.addEventListener('DOMContentLoaded', () => {
    checkHealth();
});

