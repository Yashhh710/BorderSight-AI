/* ── BORDER SURVEILLANCE REAL OWNER ALERT & NOTIFICATION SYSTEM ──────── */

// Global State Management
let processedAlertIds = new Set(JSON.parse(sessionStorage.getItem('processed_alert_ids') || '[]'));
let audioCtx = null;
let sirenOscillator = null;
let sirenGain = null;
let sirenInterval = null;
let isSirenPlaying = false;
let currentActiveBannerAlertId = null;

// Notification Preferences
function getNotificationSettings() {
    const defaults = {
        browserNotifications: true,
        audioSiren: true,
        emailAlerts: false,
        ownerEmail: "owner@surveillance.gov.in",
        minimumSeverity: "HIGH" // ALL, MEDIUM, HIGH, CRITICAL
    };
    try {
        const stored = localStorage.getItem('owner_notification_settings');
        return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
    } catch (e) {
        return defaults;
    }
}

function saveNotificationSettings(settings) {
    localStorage.setItem('owner_notification_settings', JSON.stringify(settings));
}

/**
 * Request Web Notification Permissions from Browser
 */
async function requestNotificationPermission() {
    if (!("Notification" in window)) {
        console.warn("This browser does not support desktop notifications.");
        return false;
    }
    if (Notification.permission === "granted") {
        return true;
    }
    if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        return permission === "granted";
    }
    return false;
}

/**
 * Trigger Browser System Notification
 */
function showAlertNotification(alert) {
    const settings = getNotificationSettings();
    if (!settings.browserNotifications) return;

    if (!("Notification" in window) || Notification.permission !== "granted") {
        return;
    }

    const severity = alert.severity || "CRITICAL";
    const camera = alert.cameraId || alert.camera_id || "CAM-04";
    const target = alert.targetId || alert.target_id || "P-01";
    const location = alert.location || "Restricted Zone";
    const score = alert.riskScore !== undefined ? alert.riskScore : (alert.threat_score || 90);
    const reasons = alert.reasons && alert.reasons.length > 0 ? alert.reasons.join(', ') : "Virtual Fence Intrusion Detected";

    const title = `🚨 [${severity}] Border Breach Alert - ${location}`;
    const options = {
        body: `Camera: ${camera} | Target: ${target} | Risk Score: ${score}/100\nReasons: ${reasons}`,
        tag: `alert-${alert.alertId || alert._id || Date.now()}`,
        requireInteraction: severity === 'CRITICAL' || severity === 'HIGH',
        icon: 'https://cdn-icons-png.flaticon.com/512/1207/1207475.png'
    };

    try {
        const notification = new Notification(title, options);
        notification.onclick = function() {
            window.focus();
            window.location.href = 'incidents.html';
            notification.close();
        };
    } catch (e) {
        console.warn("Failed to create Desktop Notification:", e);
    }
}

/**
 * Initialize Web Audio Context (resumes on user gesture if needed)
 */
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

/**
 * Play Web Audio Emergency Siren (880Hz / 660Hz Alternating Two-Tone)
 */
function playAlertSound() {
    const settings = getNotificationSettings();
    if (!settings.audioSiren) return;

    try {
        initAudio();
        if (isSirenPlaying) return;
        isSirenPlaying = true;

        sirenOscillator = audioCtx.createOscillator();
        sirenGain = audioCtx.createGain();

        sirenOscillator.type = 'sawtooth';
        sirenOscillator.frequency.setValueAtTime(880, audioCtx.currentTime);

        // Moderate non-jarring volume level
        sirenGain.gain.setValueAtTime(0.12, audioCtx.currentTime);

        sirenOscillator.connect(sirenGain);
        sirenGain.connect(audioCtx.destination);
        sirenOscillator.start();

        let highTone = true;
        sirenInterval = setInterval(() => {
            if (!sirenOscillator || !audioCtx) return;
            const nextFreq = highTone ? 660 : 880;
            sirenOscillator.frequency.setValueAtTime(nextFreq, audioCtx.currentTime);
            highTone = !highTone;
        }, 350);
    } catch (e) {
        console.warn("Web Audio Siren autoplay restricted or error:", e);
    }
}

/**
 * Stop Web Audio Siren
 */
function stopAlertSound() {
    if (sirenInterval) {
        clearInterval(sirenInterval);
        sirenInterval = null;
    }
    if (sirenOscillator) {
        try {
            sirenOscillator.stop();
            sirenOscillator.disconnect();
        } catch (e) {}
        sirenOscillator = null;
    }
    isSirenPlaying = false;
}

/**
 * Render Floating In-App Critical Alert Banner
 */
function renderInAppBanner(alert) {
    currentActiveBannerAlertId = alert.alertId || alert._id;
    let banner = document.getElementById('inAppAlertBanner');

    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'inAppAlertBanner';
        banner.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 99999;
            width: 380px;
            max-width: calc(100vw - 48px);
            background: rgba(18, 5, 5, 0.95);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 2px solid #FF3B30;
            box-shadow: 0 8px 32px rgba(255, 59, 48, 0.4), 0 0 15px rgba(255, 59, 48, 0.2);
            border-radius: 12px;
            padding: 16px 20px;
            color: #FFFFFF;
            font-family: 'Inter', system-ui, sans-serif;
            animation: slideInBanner 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;
        document.body.appendChild(banner);

        // Inject keyframe animation
        if (!document.getElementById('inAppBannerStyles')) {
            const style = document.createElement('style');
            style.id = 'inAppBannerStyles';
            style.innerHTML = `
                @keyframes slideInBanner {
                    from { transform: translateY(100px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes pulseRedBanner {
                    0% { border-color: #FF3B30; box-shadow: 0 8px 32px rgba(255, 59, 48, 0.4); }
                    50% { border-color: #FFB000; box-shadow: 0 8px 32px rgba(255, 176, 0, 0.6); }
                    100% { border-color: #FF3B30; box-shadow: 0 8px 32px rgba(255, 59, 48, 0.4); }
                }
                .pulse-alert-banner { animation: pulseRedBanner 1.5s infinite; }
            `;
            document.head.appendChild(style);
        }
    }

    banner.className = 'pulse-alert-banner';
    const severity = alert.severity || 'CRITICAL';
    const camera = alert.cameraId || 'CAM-04';
    const target = alert.targetId || 'P-01';
    const score = alert.riskScore !== undefined ? alert.riskScore : 90;
    const location = alert.location || 'Restricted Zone';
    const timestamp = alert.timestamp || 'Just now';
    const reasons = alert.reasons && alert.reasons.length > 0 ? alert.reasons.join(', ') : 'Restricted Zone Breach';

    banner.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #FF3B30; box-shadow: 0 0 8px #FF3B30;"></span>
                <span style="font-size: 11px; font-weight: 700; font-family: monospace; letter-spacing: 1px; color: #FF3B30; text-transform: uppercase;">
                    CRITICAL INTRUSION ALERT
                </span>
            </div>
            <span style="font-size: 11px; font-family: monospace; color: #A1A1A1;">${timestamp}</span>
        </div>

        <div style="font-size: 15px; font-weight: 700; color: #FFF; margin-bottom: 6px;">
            ${location} Breach Detected
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; font-family: monospace; background: rgba(0,0,0,0.5); padding: 8px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 10px;">
            <div><span style="color:#666;">CAMERA:</span> <strong style="color:#FFF;">${camera}</strong></div>
            <div><span style="color:#666;">TARGET:</span> <strong style="color:#FFB000;">${target}</strong></div>
            <div><span style="color:#666;">RISK SCORE:</span> <strong style="color:#FF3B30;">${score}/100</strong></div>
            <div><span style="color:#666;">SEVERITY:</span> <strong style="color:#FF3B30;">${severity}</strong></div>
        </div>

        <div style="font-size: 11px; color: #A1A1A1; margin-bottom: 12px; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            <span style="color: #666;">REASON:</span> ${reasons}
        </div>

        <div style="display: flex; gap: 10px;">
            <a href="incidents.html" style="flex: 1; text-align: center; background: #242424; border: 1px solid #333; color: #FFF; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; font-family: monospace; cursor: pointer; transition: background 0.2s;">
                VIEW INCIDENT
            </a>
            <button onclick="handleAcknowledgeBannerAlert('${alert.alertId || alert._id}')" style="flex: 1.2; background: #FF3B30; border: none; color: #FFF; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; font-family: monospace; cursor: pointer; transition: background 0.2s; box-shadow: 0 0 10px rgba(255,59,48,0.4);">
                ACKNOWLEDGE
            </button>
        </div>
    `;
}

/**
 * Handle Acknowledge Click from In-App Banner
 */
async function handleAcknowledgeBannerAlert(alertId) {
    stopAlertSound();
    
    const banner = document.getElementById('inAppAlertBanner');
    if (banner) {
        banner.style.display = 'none';
    }

    if (alertId && typeof acknowledgeAlertApi === 'function') {
        await acknowledgeAlertApi(alertId);
    }
    
    // Notify open windows to refresh alert state
    window.dispatchEvent(new CustomEvent('alert-acknowledged', { detail: { alertId } }));
}

/**
 * Poll Backend MongoDB Atlas / Session State for Real-Time Intrusion Alerts
 */
async function pollForAlerts() {
    try {
        let alerts = [];
        if (typeof getAlertsApi === 'function') {
            alerts = await getAlertsApi(10);
        } else {
            alerts = JSON.parse(sessionStorage.getItem('bordersight_live_alerts') || '[]');
        }

        if (!Array.isArray(alerts) || alerts.length === 0) return;

        // Sort by time/sortValue descending to get latest
        const sorted = [...alerts].sort((a, b) => (b.sortValue || 0) - (a.sortValue || 0));
        const latestAlert = sorted[0];

        const alertId = latestAlert.alertId || latestAlert._id;
        const status = latestAlert.status || 'ACTIVE';

        if (status === 'ACTIVE' && alertId && !processedAlertIds.has(alertId)) {
            processedAlertIds.add(alertId);
            sessionStorage.setItem('processed_alert_ids', JSON.stringify(Array.from(processedAlertIds)));

            console.log(`[REAL OWNER ALERT SYSTEM] New Active Intrusion Alert Detected: ${alertId}`);

            // Dispatch global event for live pages to update counters & tables dynamically
            window.dispatchEvent(new CustomEvent('new-border-alert', { detail: latestAlert }));

            // Trigger Owner Alert Mechanisms
            showAlertNotification(latestAlert);
            playAlertSound();
            renderInAppBanner(latestAlert);
        }
    } catch (e) {
        console.warn("Alert Polling Error:", e);
    }
}

/**
 * Start Real-Time Alert Monitoring Loop (Every 2.5 seconds)
 */
function startAlertPolling() {
    // Request permission on initial load or user gesture
    requestNotificationPermission();

    // Unlock audio context on user interaction
    const unlockAudio = () => {
        initAudio();
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('keydown', unlockAudio);

    // Initial check
    pollForAlerts();

    // Poll every 2500ms
    setInterval(pollForAlerts, 2500);
}

// Auto-start notification manager on page load
document.addEventListener('DOMContentLoaded', () => {
    startAlertPolling();
});
