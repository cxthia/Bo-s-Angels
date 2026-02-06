// ranking.js - Scores and ranks candidates, applies hysteresis

const DEFAULT_K = 6;
const HYSTERESIS_TIME = 3000; // ms - very long to keep predictions stable for users with tremors

// Scoring weights
const WEIGHTS = {
  alignment: 3.0,
  size: 1.0,
  distance: 1.5,
  priority: 2.0,
  risk: 5.0
};

const LEARNING_RATE = 0.1; // How quickly to adapt weights

class CandidateRanker {
  constructor() {
    this.topK = DEFAULT_K;
    this.lastPredictions = [];
    this.lastPredictionTime = 0;
    this.weights = { ...WEIGHTS };
    this.hysteresisTime = HYSTERESIS_TIME;
    this.learningRate = LEARNING_RATE;
    this.feedbackCount = 0;
  }

  // Compute score for a candidate
  scoreCandidate(candidate) {
    const { alignment, distance, size, priority } = candidate;

    // Normalize features
    const alignmentScore = alignment; // Already 0..1
    const sizeScore = Math.min(1, size / 10000); // Normalize by typical button size
    const distanceScore = 1 / (1 + Math.log(1 + distance));

    // Risk penalty
    const riskPenalty = candidate.isRisky ? this.weights.risk : 0;

    const score = 
      this.weights.alignment * alignmentScore +
      this.weights.size * sizeScore +
      this.weights.distance * distanceScore +
      this.weights.priority * (priority / 10) -
      riskPenalty;

    return score;
  }

  // Select top K candidates with hysteresis
  selectTopK(candidates) {
    if (candidates.length === 0) {
      return [];
    }

    // Score all candidates
    const scored = candidates.map(c => ({
      ...c,
      score: this.scoreCandidate(c)
    }));

    // Sort by score (descending)
    scored.sort((a, b) => b.score - a.score);

    // Select top K
    let topK = scored.slice(0, this.topK);

    // Apply hysteresis
    const now = Date.now();
    const timeSinceLastPrediction = now - this.lastPredictionTime;

    if (timeSinceLastPrediction < this.hysteresisTime && this.lastPredictions.length > 0) {
      // Keep previous predictions if they're still in top candidates with reasonable score
      const previousElements = new Set(
        this.lastPredictions.map(p => p.element)
      );

      const currentTopScores = topK.map(c => c.score);
      const minScore = Math.min(...currentTopScores) * 0.7; // 70% threshold

      // Try to retain previous predictions
      const retained = scored.filter(c => 
        previousElements.has(c.element) && c.score >= minScore
      ).slice(0, this.topK);

      if (retained.length >= this.topK * 0.5) {
        // If we can retain at least half, use retained predictions
        topK = retained;
      }
    }

    this.lastPredictions = topK;
    this.lastPredictionTime = now;

    return topK;
  }

  setTopK(k) {
    this.topK = k;
  }

  getTopK() {
    return this.topK;
  }

  setHysteresisTime(time) {
    // Update the constant by modifying it on the instance
    console.log('[CandidateRanker] Setting hysteresis time to:', time);
    this.hysteresisTime = time;
  }

  updateWeights(newWeights) {
    this.weights = { ...this.weights, ...newWeights };
  }

  getWeights() {
    return { ...this.weights };
  }

  // Online learning: Update weights based on user feedback
  learnFromFeedback(clickedCandidate, allCandidates) {
    if (!clickedCandidate || allCandidates.length === 0) return;

    // Find the rank of the clicked element
    const clickedIndex = allCandidates.findIndex(c => c.element === clickedCandidate.element);
    if (clickedIndex === -1) return;

    console.log('[Ranker] Learning from feedback. Clicked rank:', clickedIndex + 1);

    // Extract features for clicked element
    const clicked = allCandidates[clickedIndex];
    const clickedFeatures = this.extractFeatures(clicked);

    // If user clicked a lower-ranked element, adjust weights
    // Reward features of clicked element, penalize features of higher-ranked elements
    if (clickedIndex > 0) {
      // User chose element that wasn't #1 - learn from this
      const topElement = allCandidates[0];
      const topFeatures = this.extractFeatures(topElement);

      // Update weights: increase importance of clicked features, decrease others
      for (const feature in clickedFeatures) {
        if (feature === 'risk') continue; // Don't adjust risk weight

        const clickedValue = clickedFeatures[feature];
        const topValue = topFeatures[feature];

        // If clicked element had higher value in this feature, increase weight
        // If top element had higher value, decrease weight slightly
        if (clickedValue > topValue) {
          this.weights[feature] += this.learningRate * (clickedValue - topValue);
        } else {
          this.weights[feature] -= this.learningRate * 0.5 * (topValue - clickedValue);
        }

        // Keep weights positive and bounded
        this.weights[feature] = Math.max(0.1, Math.min(10, this.weights[feature]));
      }

      this.feedbackCount++;
      console.log('[Ranker] Updated weights:', this.weights, 'Feedback count:', this.feedbackCount);

      // Save learned weights periodically
      if (this.feedbackCount % 5 === 0) {
        this.saveWeights();
      }
    } else {
      console.log('[Ranker] User clicked top prediction - weights already good!');
    }
  }

  extractFeatures(candidate) {
    const alignmentScore = candidate.alignment || 0;
    const sizeScore = Math.min(1, (candidate.size || 0) / 10000);
    const distanceScore = 1 / (1 + Math.log(1 + (candidate.distance || 1)));
    const priorityScore = (candidate.priority || 0) / 10;

    return {
      alignment: alignmentScore,
      size: sizeScore,
      distance: distanceScore,
      priority: priorityScore
    };
  }

  async loadWeights() {
    try {
      const result = await chrome.storage.local.get(['learnedWeights']);
      if (result.learnedWeights) {
        this.weights = { ...WEIGHTS, ...result.learnedWeights };
        console.log('[Ranker] Loaded learned weights:', this.weights);
      }
    } catch (error) {
      console.error('[Ranker] Error loading weights:', error);
    }
  }

  async saveWeights() {
    try {
      await chrome.storage.local.set({ learnedWeights: this.weights });
      console.log('[Ranker] Saved learned weights:', this.weights);
    } catch (error) {
      console.error('[Ranker] Error saving weights:', error);
    }
  }

  resetWeights() {
    this.weights = { ...WEIGHTS };
    this.feedbackCount = 0;
    chrome.storage.local.remove(['learnedWeights']);
    console.log('[Ranker] Reset weights to defaults');
  }
}

window.CandidateRanker = CandidateRanker;
