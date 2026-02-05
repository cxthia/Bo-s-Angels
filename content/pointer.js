// pointer.js - Tracks pointer movement and computes prediction cone

const HISTORY_DURATION = 1200; // ms - longer history for smoother tracking
const UPDATE_INTERVAL = 300; // ms (3.3 Hz) - much slower for users with tremors
const CONE_ANGLE_DEG = 40; // degrees
const MAX_DISTANCE = 600; // px
const MIN_MOVEMENT_THRESHOLD = 30; // px - ignore small jittery movements

class PointerTracker {
  constructor() {
    this.history = [];
    this.currentPosition = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    this.isMoving = false;
    this.lastUpdate = 0;
    this.updateCallbacks = [];
    this.rafId = null;
    this.isTracking = false;
    this.coneAngle = CONE_ANGLE_DEG;
    this.maxDistance = MAX_DISTANCE;
  }

  start() {
    if (this.isTracking) return;
    this.isTracking = true;
    
    document.addEventListener('mousemove', this.handleMouseMove);
    this.rafId = requestAnimationFrame(this.update);
  }

  stop() {
    this.isTracking = false;
    document.removeEventListener('mousemove', this.handleMouseMove);
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  handleMouseMove = (event) => {
    this.currentPosition = {
      x: event.clientX,
      y: event.clientY,
      timestamp: Date.now()
    };

    // Add to history
    this.history.push(this.currentPosition);

    // Remove old entries
    const cutoff = Date.now() - HISTORY_DURATION;
    this.history = this.history.filter(p => p.timestamp > cutoff);
  }

  update = () => {
    const now = Date.now();
    
    // Throttle updates
    if (now - this.lastUpdate < UPDATE_INTERVAL) {
      this.rafId = requestAnimationFrame(this.update);
      return;
    }

    this.lastUpdate = now;
    this.computeVelocity();
    this.notifyUpdate();

    if (this.isTracking) {
      this.rafId = requestAnimationFrame(this.update);
    }
  }

  computeVelocity() {
    if (this.history.length < 3) {
      this.velocity = { x: 0, y: 0 };
      this.isMoving = false;
      return;
    }

    // Use much smoother averaging for users with tremors
    const recent = this.history.slice(-10); // Last 10 positions for smoother average
    
    // Calculate overall displacement (ignoring jitter)
    const first = recent[0];
    const last = recent[recent.length - 1];
    const totalDx = last.x - first.x;
    const totalDy = last.y - first.y;
    const totalDistance = Math.sqrt(totalDx ** 2 + totalDy ** 2);
    const totalTime = (last.timestamp - first.timestamp) / 1000;

    // Ignore small movements (likely tremor/jitter)
    if (totalDistance < MIN_MOVEMENT_THRESHOLD || totalTime === 0) {
      this.isMoving = false;
      return;
    }

    // Calculate smoothed velocity based on overall displacement
    this.velocity = {
      x: totalDx / totalTime,
      y: totalDy / totalTime
    };

    const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    this.isMoving = speed > 20; // Higher threshold to ignore tremors
  }

  // Filter candidates within prediction cone
  filterCandidatesInCone(candidates) {
    if (!this.isMoving || this.history.length === 0) {
      return []; // No prediction when not moving
    }

    const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    if (speed < 10) return [];

    // Normalize velocity to direction vector
    const dirX = this.velocity.x / speed;
    const dirY = this.velocity.y / speed;

    const currentPos = this.currentPosition;
    const coneAngleRad = (this.coneAngle * Math.PI) / 180;
    const filtered = [];

    for (const candidate of candidates) {
      const { center } = candidate;
      
      // Vector from current position to candidate
      const toTargetX = center.x - currentPos.x;
      const toTargetY = center.y - currentPos.y;
      const distance = Math.sqrt(toTargetX ** 2 + toTargetY ** 2);

      if (distance === 0 || distance > this.maxDistance) continue;

      // Normalize
      const toTargetDirX = toTargetX / distance;
      const toTargetDirY = toTargetY / distance;

      // Compute angle using dot product
      const dotProduct = dirX * toTargetDirX + dirY * toTargetDirY;
      const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));

      // Check if within cone
      if (angle <= coneAngleRad) {
        // Add geometric features for ranking
        filtered.push({
          ...candidate,
          distance: distance,
          alignment: dotProduct, // 0..1, higher is better
          aheadness: dotProduct * distance // How far ahead along direction
        });
      }
    }

    return filtered;
  }

  onUpdate(callback) {
    this.updateCallbacks.push(callback);
  }

  notifyUpdate() {
    this.updateCallbacks.forEach(cb => cb());
  }

  getVelocity() {
    return this.velocity;
  }

  getCurrentPosition() {
    return this.currentPosition;
  }

  getIsMoving() {
    return this.isMoving;
  }

  setConeAngle(angle) {
    console.log('[PointerTracker] Setting cone angle to:', angle);
    this.coneAngle = angle;
  }

  setMaxDistance(distance) {
    console.log('[PointerTracker] Setting max distance to:', distance);
    this.maxDistance = distance;
  }
}

window.PointerTracker = PointerTracker;
