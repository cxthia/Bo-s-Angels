// ranking.js - Scores and ranks candidates, applies hysteresis

const DEFAULT_K = 6;
const HYSTERESIS_TIME = 2000; // ms - much longer to keep predictions stable for users with tremors

// Scoring weights
const WEIGHTS = {
  alignment: 3.0,
  size: 1.0,
  distance: 1.5,
  priority: 2.0,
  risk: 5.0
};

class CandidateRanker {
  constructor() {
    this.topK = DEFAULT_K;
    this.lastPredictions = [];
    this.lastPredictionTime = 0;
    this.weights = { ...WEIGHTS };
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

    if (timeSinceLastPrediction < HYSTERESIS_TIME && this.lastPredictions.length > 0) {
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

  updateWeights(newWeights) {
    this.weights = { ...this.weights, ...newWeights };
  }

  getWeights() {
    return { ...this.weights };
  }
}

window.CandidateRanker = CandidateRanker;
