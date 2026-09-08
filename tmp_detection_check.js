




    /* â”€â”€ SIDEBAR COLLAPSE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    const sidebar    = document.getElementById('sidebar');
    const collapseBtn = document.getElementById('collapseBtn');
    const navItems   = document.querySelectorAll('.nav-item');

    if (collapseBtn) collapseBtn.addEventListener('click', () => sidebar.classList.toggle('collapsed'));

    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    navItems.forEach(item => {
        if (item.getAttribute('data-page') === currentPath) item.classList.add('active');
    });

    /* â”€â”€ LIVE DATE / TIME â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    function formatTime(d) {
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    }
    function updateDatetime() {
        const now = new Date();
        const formatted = now.toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        }).replace(',', ' Â·');
        const el = document.getElementById('liveDatetime');
        if (el) el.textContent = formatted;

        const offsets = [0, -5, -11, -20, -25];
        ['et1','et2','et3','et4','et5'].forEach((id, i) => {
            const el2 = document.getElementById(id);
            if (el2) {
                const t = new Date(now.getTime() + offsets[i] * 1000);
                el2.textContent = formatTime(t);
            }
        });

        const ls = document.getElementById('lastSeen');
        if (ls) ls.textContent = formatTime(now);
    }
    updateDatetime();
    setInterval(updateDatetime, 1000);

    /* â”€â”€ SLIDER LIVE VALUES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    const confSlider = document.getElementById('confSlider');
    const trackSlider = document.getElementById('trackSlider');
    confSlider.addEventListener('input', () => {
        document.getElementById('confVal').textContent = confSlider.value + '%';
    });
    trackSlider.addEventListener('input', () => {
        document.getElementById('trackVal').textContent = trackSlider.value + '%';
    });

    /* â”€â”€ VIDEO CONTROLS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    const vid = document.getElementById('uploadedVideo');
    const img = document.getElementById('vidBg');
    const videoWrap = document.getElementById('videoWrap');
    const detectionCanvas = document.getElementById('detectionCanvas');
    const cameraLabel = document.getElementById('cameraLabel');
    const modelStatus = cameraLabel;
    let paused = false;
    let model = null;
    let animationFrameId = null;
    let lastDetectionTime = 0;
    let trackedObjects = new Map();
    let lastVisibleObjects = [];

    function setCameraLabel(text) {
        if (modelStatus) {
            modelStatus.textContent = text;
        }
    }

    function getVideoElement() {
        return vid && vid.style.display !== 'none' ? vid : null;
    }

    function resizeDetectionCanvas() {
        if (!detectionCanvas || !videoWrap) return;
        const rect = videoWrap.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;
        detectionCanvas.width = Math.max(1, Math.floor(rect.width * ratio));
        detectionCanvas.height = Math.max(1, Math.floor(rect.height * ratio));
        detectionCanvas.style.width = rect.width + 'px';
        detectionCanvas.style.height = rect.height + 'px';
        const ctx = detectionCanvas.getContext('2d');
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function drawDetectionOverlay(predictions) {
        const ctx = detectionCanvas.getContext('2d');
        const rect = videoWrap.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        ctx.clearRect(0, 0, w, h);

        if (!predictions || !predictions.length) {
            lastVisibleObjects = [];
            return;
        }

        const threshold = Number(confSlider.value) / 100;
        const relevantPredictions = predictions.filter((prediction) => {
            const label = prediction.className.toLowerCase();
            const relevant = label === 'person' || ['car', 'truck', 'bus', 'motorcycle', 'bicycle'].includes(label);
            return relevant && prediction.score >= threshold;
        });

        const vehicleColors = {
            person: '#FFB000',
            car: '#3B82F6',
            truck: '#8B5CF6',
            bus: '#22C55E',
            motorcycle: '#F97316',
            bicycle: '#EC4899'
        };

        const currentObjects = [];
        relevantPredictions.forEach((prediction) => {
            const label = prediction.className.toLowerCase();
            const [x, y, width, height] = prediction.bbox;
            const normX = Math.min(Math.max(x, 0), w);
            const normY = Math.min(Math.max(y, 0), h);
            const normWidth = Math.min(width, w - normX);
            const normHeight = Math.min(height, h - normY);
            const color = vehicleColors[label] || '#FFB000';

            currentObjects.push({
                label,
                x: normX,
                y: normY,
                width: normWidth,
                height: normHeight,
                score: prediction.score,
                color
            });

            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.18;
            ctx.fillRect(normX, normY, normWidth, normHeight);
            ctx.globalAlpha = 1;
            ctx.strokeRect(normX, normY, normWidth, normHeight);

            const displayName = label === 'person' ? 'PERSON' : label.toUpperCase();
            const labelText = `${displayName} ${prediction.score.toFixed(1)}%`;
            ctx.fillStyle = color;
            ctx.font = '600 11px Inter, sans-serif';
            ctx.fillRect(normX, Math.max(normY - 18, 4), ctx.measureText(labelText).width + 12, 18);
            ctx.fillStyle = '#000';
            ctx.fillText(labelText, normX + 6, Math.max(normY - 5, 16));
        });

        let personCount = 0;
        let vehicleCount = 0;
        currentObjects.forEach((obj) => {
            if (obj.label === 'person') personCount += 1;
            else vehicleCount += 1;
        });

        const personStat = document.getElementById('personStat');
        const vehicleStat = document.getElementById('vehicleStat');
        const suspiciousStat = document.getElementById('suspiciousStat');
        if (personStat) personStat.textContent = String(personCount);
        if (vehicleStat) vehicleStat.textContent = String(vehicleCount);
        if (suspiciousStat) suspiciousStat.textContent = String(Math.max(0, currentObjects.length - (personCount + vehicleCount)));

        lastVisibleObjects = currentObjects;
    }

    async function runDetectionFrame() {
        const activeVideo = getVideoElement();
        if (!activeVideo || !model || activeVideo.readyState < 2 || activeVideo.paused || activeVideo.ended) return;
        if (Date.now() - lastDetectionTime < 300) return;

        lastDetectionTime = Date.now();
        try {
            const predictions = await model.detect(activeVideo);
            drawDetectionOverlay(predictions);
        } catch (error) {
            console.error('Detection failed:', error);
        }
    }

    function tick() {
        if (!paused) {
            runDetectionFrame();
        }
        animationFrameId = requestAnimationFrame(tick);
    }

    async function loadModel() {
        if (!window.cocoSsd || !window.tf) {
            setCameraLabel('CAM-04 â€¢ MODEL UNAVAILABLE');
            return;
        }

        try {
            setCameraLabel('CAM-04 â€¢ LOADING MODEL');
            model = await window.cocoSsd.load();
            setCameraLabel('CAM-04 â€¢ AI READY');
        } catch (error) {
            console.error('Model load failed:', error);
            setCameraLabel('CAM-04 â€¢ MODEL ERROR');
        }
    }

    document.getElementById('pauseBtn').addEventListener('click', function () {
        const activeVideo = getVideoElement();
        paused = !paused;
        if (paused) {
            if (activeVideo) activeVideo.pause();
            img.style.filter = 'contrast(1.1) saturate(0.85) brightness(0.4)';
            this.innerHTML = '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" width="13" height="13"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
        } else {
            if (activeVideo) activeVideo.play();
            img.style.filter = 'contrast(1.1) saturate(0.85)';
            this.innerHTML = '<svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" width="13" height="13"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
        }
    });

    document.getElementById('snapshotBtn').addEventListener('click', function () {
        const canvas = document.createElement('canvas');
        const wrap = document.getElementById('videoWrap');
        const activeVideo = getVideoElement();
        canvas.width = wrap.offsetWidth;
        canvas.height = wrap.offsetHeight;
        const ctx = canvas.getContext('2d');
        if (activeVideo) {
            ctx.drawImage(activeVideo, 0, 0, canvas.width, canvas.height);
        } else {
            const image = document.getElementById('vidBg');
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        }
        const link = document.createElement('a');
        link.download = 'snapshot-' + Date.now() + '.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });

    document.getElementById('fsBtn').addEventListener('click', function () {
        const wrap = document.getElementById('videoWrap');
        if (!document.fullscreenElement) wrap.requestFullscreen().catch(() => {});
        else document.exitFullscreen().catch(() => {});
    });

    document.getElementById('uploadBtn').addEventListener('click', () => {
        document.getElementById('videoFileInput').click();
    });

    document.getElementById('videoFileInput').addEventListener('change', function () {
        if (this.files && this.files[0]) {
            const url = URL.createObjectURL(this.files[0]);
            const img = document.getElementById('vidBg');
            vid.src = url;
            vid.style.display = 'block';
            img.style.display = 'none';
            if (model) setCameraLabel('CAM-04 â€¢ ANALYZING VIDEO');
            vid.play().catch(() => {});
            resizeDetectionCanvas();
        }
    });

    function updateTrackPath() {
        const canvas = document.getElementById('trackCanvas');
        if (!canvas) return;
        const wrap = canvas.parentElement;
        canvas.width = wrap.offsetWidth || 260;
        canvas.height = wrap.offsetHeight || 56;
        const ctx = canvas.getContext('2d');

        const pts = [
            [0.05, 0.7], [0.15, 0.5], [0.28, 0.6], [0.42, 0.35],
            [0.55, 0.45], [0.67, 0.3], [0.78, 0.5], [0.9, 0.4], [0.98, 0.55]
        ];
        let progress = 0;

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(255,255,255,0.04)';
            for (let x = 10; x < canvas.width; x += 18)
                for (let y = 8; y < canvas.height; y += 14)
                    ctx.fillRect(x, y, 1, 1);

            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255,176,0,0.15)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            pts.forEach((p, i) => {
                const x = p[0] * canvas.width;
                const y = p[1] * canvas.height;
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            });
            ctx.stroke();

            const count = Math.max(2, Math.floor(progress * (pts.length - 1)));
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255,176,0,0.9)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([]);
            for (let i = 0; i <= count && i < pts.length; i++) {
                const x = pts[i][0] * canvas.width;
                const y = pts[i][1] * canvas.height;
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();

            const ci = Math.min(count, pts.length - 1);
            const cx = pts[ci][0] * canvas.width;
            const cy = pts[ci][1] * canvas.height;
            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#FFB000';
            ctx.shadowColor = 'rgba(255,176,0,0.6)';
            ctx.shadowBlur = 6;
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.beginPath();
            ctx.arc(pts[0][0] * canvas.width, pts[0][1] * canvas.height, 3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,176,0,0.5)';
            ctx.fill();

            progress += 0.004;
            if (progress > 1) progress = 0;
            requestAnimationFrame(draw);
        }
        draw();
    }

    window.addEventListener('resize', resizeDetectionCanvas);
    resizeDetectionCanvas();
    updateTrackPath();
    loadModel();
    tick();

