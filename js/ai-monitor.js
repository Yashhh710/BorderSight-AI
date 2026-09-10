/* ── BORDER SURVEILLANCE AUTOMATIC MULTI-CAMERA AI MONITORING ENGINE ──── */

class AIMonitorEngine {
    constructor() {
        this.model = null;
        this.isModelLoading = false;
        this.isModelLoaded = false;
        this.cameras = new Map();
        this.nextTargetIdNumber = 1;
        this.nextVehicleIdNumber = 1;
        this.isMonitoringActive = false;
        this.activeCooldowns = new Map(); // cameraId -> timestamp
        this.inferenceIntervalMs = 250; // 4 FPS per camera (highly stable & responsive)
        this.eventTimeline = [];
    }

    /**
     * Load TensorFlow.js COCO-SSD Model globally
     */
    async loadModel() {
        if (this.isModelLoaded || this.isModelLoading) return true;
        this.isModelLoading = true;
        console.log("[AI Monitor Engine] Loading TensorFlow.js COCO-SSD Neural Network...");

        try {
            if (typeof cocoSsd !== 'undefined') {
                this.model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
                this.isModelLoaded = true;
                this.isModelLoading = false;
                console.log("[AI Monitor Engine] TensorFlow.js COCO-SSD Model Loaded Successfully!");
                window.dispatchEvent(new CustomEvent('ai-model-ready'));
                return true;
            } else {
                console.warn("[AI Monitor Engine] cocoSsd global not found. Ensure TensorFlow.js script is included.");
            }
        } catch (e) {
            console.error("[AI Monitor Engine] Model load failed:", e);
        }
        this.isModelLoading = false;
        return false;
    }

    /**
     * Register a surveillance camera for automatic AI processing
     */
    registerCamera(config) {
        const camId = config.cameraId;
        const defaults = {
            cameraId: camId,
            name: `Camera ${camId}`,
            location: 'Border Perimeter',
            videoSrc: `models/video/1st.mp4`,
            isAiAnalyzable: true,
            aiStatus: config.isAiAnalyzable !== false ? 'AI ACTIVE' : 'AI UNAVAILABLE (CORS STREAM)',
            liveStatus: 'ONLINE',
            videoEl: null,
            targets: [], // [{ id, class, bbox, center, lastSeen }]
            fence: config.fence || { x1: 0.15, y1: 0.45, x2: 0.85, y2: 0.90, label: 'RESTRICTED ZONE' },
            riskScore: 0,
            threatLevel: 'LOW',
            reasons: [],
            isBreached: false,
            lastBreachTime: 0,
            personCount: 0,
            vehicleCount: 0,
            lastDetectionText: 'No targets detected'
        };

        const camState = { ...defaults, ...config };
        this.cameras.set(camId, camState);
        console.log(`[AI Monitor Engine] Registered Camera ${camId} [${camState.aiStatus}]`);
        return camState;
    }

    /**
     * Start Automatic Multi-Camera Background AI Loop
     */
    async startMonitoring() {
        if (this.isMonitoringActive) return;
        this.isMonitoringActive = true;

        await this.loadModel();

        // Stagger camera processing loop
        this.runMonitoringLoop();
    }

    /**
     * Main background processing loop across all registered cameras
     */
    async runMonitoringLoop() {
        if (!this.isMonitoringActive) return;

        const cameraList = Array.from(this.cameras.values());
        for (const cam of cameraList) {
            if (!this.isMonitoringActive) break;
            if (cam.isAiAnalyzable && cam.videoEl && cam.videoEl.readyState >= 2 && this.isModelLoaded) {
                try {
                    await this.analyzeCameraFrame(cam);
                } catch (e) {
                    console.warn(`[AI Monitor Engine] Frame error on ${cam.cameraId}:`, e);
                }
            }
        }

        // Schedule next iteration (staggered for smooth rendering)
        setTimeout(() => this.runMonitoringLoop(), this.inferenceIntervalMs);
    }

    /**
     * Analyze a single camera video frame using TensorFlow.js COCO-SSD
     */
    async analyzeCameraFrame(cam) {
        if (!this.model || !cam.videoEl) return;

        // Perform object detection
        const rawDetections = await this.model.detect(cam.videoEl);
        
        // Filter relevant target classes (person, car, truck, bus, motorcycle)
        const relevantDetections = rawDetections.filter(d => 
            d.score >= 0.45 && ['person', 'car', 'truck', 'bus', 'motorcycle'].includes(d.class)
        );

        // Multi-Target Nearest-Centroid Tracking
        const currentTargets = this.updateTracking(cam, relevantDetections);
        
        let personCount = 0;
        let vehicleCount = 0;
        let zoneBreachDetected = false;
        let highestRiskScore = 0;
        let activeReasons = [];
        let breachedTargetId = null;

        const vidW = cam.videoEl.videoWidth || 640;
        const vidH = cam.videoEl.videoHeight || 480;

        // Polygon virtual fence coordinates
        const fencePx = {
            x1: cam.fence.x1 * vidW,
            y1: cam.fence.y1 * vidH,
            x2: cam.fence.x2 * vidW,
            y2: cam.fence.y2 * vidH
        };

        currentTargets.forEach(target => {
            if (target.class === 'person') personCount++;
            else vehicleCount++;

            // Ground contact point (bottom-center of bounding box)
            const footX = target.bbox[0] + (target.bbox[2] / 2);
            const footY = target.bbox[1] + target.bbox[3];

            // Check if foot point lies inside virtual fence
            const insideFence = (footX >= fencePx.x1 && footX <= fencePx.x2 && footY >= fencePx.y1 && footY <= fencePx.y2);
            target.insideFence = insideFence;

            if (insideFence) {
                zoneBreachDetected = true;
                breachedTargetId = target.id;
            }
        });

        cam.personCount = personCount;
        cam.vehicleCount = vehicleCount;

        // Compute Explainable 0-100 Risk Score
        let score = 0;
        if (personCount > 0) { score += 20; activeReasons.push("Person signature detected"); }
        if (vehicleCount > 0) { score += 15; activeReasons.push("Vehicle signature detected"); }
        if (zoneBreachDetected) { score += 40; activeReasons.push("Restricted Zone Breach"); }
        if (personCount > 1) { score += 15; activeReasons.push("Group movement pattern"); }
        if (zoneBreachDetected && personCount > 0) { score += 10; activeReasons.push("High-priority perimeter violation"); }

        score = Math.min(100, score);
        cam.riskScore = score;
        cam.reasons = activeReasons;
        cam.isBreached = zoneBreachDetected;

        // Threat Level Categorization
        if (score >= 80) cam.threatLevel = 'CRITICAL';
        else if (score >= 60) cam.threatLevel = 'HIGH';
        else if (score >= 30) cam.threatLevel = 'MEDIUM';
        else cam.threatLevel = 'LOW';

        if (currentTargets.length > 0) {
            const first = currentTargets[0];
            cam.lastDetectionText = `${first.class.toUpperCase()} (${first.id}) ${Math.round(first.score * 100)}%`;
        }

        // Trigger Real Intrusion Alert if breach occurs and 4s cooldown passed
        if (zoneBreachDetected && score >= 60) {
            this.handleIntrusionEvent(cam, breachedTargetId || 'P-01', score, activeReasons);
        }

        // Emit frame update event for UI subscribers (Command Center grid & AI Monitoring page)
        window.dispatchEvent(new CustomEvent('ai-camera-frame-update', { 
            detail: { 
                cameraId: cam.cameraId, 
                targets: currentTargets, 
                riskScore: score, 
                threatLevel: cam.threatLevel,
                personCount,
                vehicleCount,
                isBreached: zoneBreachDetected
            } 
        }));
    }

    /**
     * Nearest-Centroid Multi-Target Tracking Algorithm
     */
    updateTracking(cam, detections) {
        const updatedTargets = [];
        const existingTargets = cam.targets || [];
        const distanceThreshold = 120; // pixels

        detections.forEach(det => {
            const [x, y, w, h] = det.bbox;
            const cx = x + w / 2;
            const cy = y + h / 2;

            let minDistance = Infinity;
            let matchedTarget = null;

            existingTargets.forEach(target => {
                if (target.class === det.class) {
                    const dist = Math.hypot(cx - target.center.x, cy - target.center.y);
                    if (dist < minDistance && dist < distanceThreshold) {
                        minDistance = dist;
                        matchedTarget = target;
                    }
                }
            });

            if (matchedTarget) {
                matchedTarget.bbox = det.bbox;
                matchedTarget.center = { x: cx, y: cy };
                matchedTarget.score = det.score;
                matchedTarget.lastSeen = Date.now();
                updatedTargets.push(matchedTarget);
            } else {
                const prefix = det.class === 'person' ? 'P-' : 'V-';
                const num = det.class === 'person' ? String(this.nextTargetIdNumber++).padStart(2, '0') : String(this.nextVehicleIdNumber++).padStart(2, '0');
                const newTarget = {
                    id: `${prefix}${num}`,
                    class: det.class,
                    bbox: det.bbox,
                    center: { x: cx, y: cy },
                    score: det.score,
                    lastSeen: Date.now()
                };
                updatedTargets.push(newTarget);
            }
        });

        cam.targets = updatedTargets;
        return updatedTargets;
    }

    /**
     * Handle Genuine Intrusion Event (4s Cooldown + Snapshot + Backend Sync + Notifications)
     */
    async handleIntrusionEvent(cam, targetId, riskScore, reasons) {
        const lastAlert = this.activeCooldowns.get(cam.cameraId) || 0;
        const now = Date.now();

        if (now - lastAlert < 4000) return; // 4 second cooldown
        this.activeCooldowns.set(cam.cameraId, now);

        console.log(`[AI Monitor Engine] 🚨 INTRUSION BREACH DETECTED on ${cam.cameraId} (${targetId}) - Score ${riskScore}/100`);

        // Capture Evidence Snapshot from Video Element
        const snapshot = this.captureSnapshot(cam.videoEl);

        const alertObj = {
            alertId: `ALT-${now}`,
            cameraId: cam.cameraId,
            targetId: targetId,
            eventType: 'INTRUSION',
            riskScore: riskScore,
            severity: cam.threatLevel,
            reasons: reasons,
            title: `Restricted Zone Breach (${targetId})`,
            location: cam.location,
            confidence: '94%',
            zoneStatus: 'BREACH DETECTED',
            hasFeed: true,
            evidenceSnapshot: snapshot,
            images: [snapshot, 'models/img/Unauthorized.png'],
            timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            sortValue: now,
            status: 'ACTIVE'
        };

        // Add to local timeline
        this.eventTimeline.unshift({
            time: alertObj.timestamp,
            cameraId: cam.cameraId,
            targetId: targetId,
            location: cam.location,
            riskScore: riskScore,
            severity: cam.threatLevel,
            reasons: reasons
        });

        // 1. Send to FastAPI + MongoDB Atlas Backend
        if (typeof createAlertApi === 'function') {
            createAlertApi(alertObj);
        }
        if (typeof createIncidentApi === 'function') {
            createIncidentApi({
                incidentId: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
                alertId: alertObj.alertId,
                cameraId: cam.cameraId,
                targetId: targetId,
                eventType: 'INTRUSION',
                severity: cam.threatLevel,
                riskScore: riskScore,
                title: `Restricted Zone Breach (${targetId})`,
                location: cam.location,
                timestamp: alertObj.timestamp,
                status: 'OPEN'
            });
        }
        if (typeof createEvidenceApi === 'function') {
            createEvidenceApi({
                evidenceId: `EVD-${now}`,
                alertId: alertObj.alertId,
                cameraId: cam.cameraId,
                targetId: targetId,
                fileName: `intrusion-breach-${targetId}-${now}.png`,
                timestamp: alertObj.timestamp
            });
        }

        // 2. Trigger Desktop Notification & Audio Siren & In-App Banner
        if (typeof showAlertNotification === 'function') showAlertNotification(alertObj);
        if (typeof playAlertSound === 'function') playAlertSound();
        if (typeof renderInAppBanner === 'function') renderInAppBanner(alertObj);

        // 3. Dispatch DOM Custom Event
        window.dispatchEvent(new CustomEvent('new-border-alert', { detail: alertObj }));
    }

    /**
     * Capture Canvas Evidence Snapshot from Video
     */
    captureSnapshot(videoEl) {
        try {
            if (!videoEl || videoEl.readyState < 2) return 'models/img/Unauthorized.png';
            const canvas = document.createElement('canvas');
            canvas.width = videoEl.videoWidth || 640;
            canvas.height = videoEl.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

            // Draw restricted zone overlay on snapshot
            ctx.strokeStyle = '#FF3B30';
            ctx.lineWidth = 4;
            ctx.strokeRect(canvas.width * 0.15, canvas.height * 0.45, canvas.width * 0.70, canvas.height * 0.45);

            ctx.fillStyle = 'rgba(255, 59, 48, 0.2)';
            ctx.fillRect(canvas.width * 0.15, canvas.height * 0.45, canvas.width * 0.70, canvas.height * 0.45);

            ctx.fillStyle = '#FF3B30';
            ctx.font = 'bold 16px monospace';
            ctx.fillText('🚨 RESTRICTED ZONE INTRUSION BREACH CAPTURED', canvas.width * 0.17, canvas.height * 0.49);

            return canvas.toDataURL('image/png');
        } catch (e) {
            return 'models/img/Unauthorized.png';
        }
    }
}

// Global Singleton Instance
window.AIMonitor = new AIMonitorEngine();
