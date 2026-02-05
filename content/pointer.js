// pointer.js - Tracks pointer movement and computes prediction cone

const HISTORY_DURATION = 600; // ms
const UPDATE_INTERVAL = 50; // ms (20 Hz)
const CONE_ANGLE_DEG = 40; // degrees
const MAX_DISTANCE = 600; // px

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
    if (this.history.length < 2) {
      this.velocity = { x: 0, y: 0 };
      this.isMoving = false;
      return;
    }

    // Use weighted moving average for smoother velocity
    let sumX = 0, sumY = 0, sumWeight = 0;
    const recent = this.history.slice(-5); // Last 5 positions

    for (let i = 1; i < recent.length; i++) {
      const weight = i; // More recent = higher weight
      const dt = (recent[i].timestamp - recent[i-1].timestamp) / 1000; // seconds
      
      if (dt > 0) {
        const vx = (recent[i].x - recent[i-1].x) / dt;
        const vy = (recent[i].y - recent[i-1].y) / dt;
        sumX += vx * weight;
        sumY += vy * weight;
        sumWeight += weight;
      }
    }

    if (sumWeight > 0) {
      this.velocity = {
        x: sumX / sumWeight,
        y: sumY / sumWeight
      };

      const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
      this.isMoving = speed > 10; // pixels per second threshold
    }
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
    const coneAngleRad = (CONE_ANGLE_DEG * Math.PI) / 180;
    const filtered = [];

    for (const candidate of candidates) {
      const { center } = candidate;
      
      // Vector from current position to candidate
      const toTargetX = center.x - currentPos.x;
      const toTargetY = center.y - currentPos.y;
      const distance = Math.sqrt(toTargetX ** 2 + toTargetY ** 2);

      if (distance === 0 || distance > MAX_DISTANCE) continue;

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
}

window.PointerTracker = PointerTracker;
