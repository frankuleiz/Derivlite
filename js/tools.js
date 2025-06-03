/**
 * DIGIT//MATCH - Advanced Trading Analysis Tool
 * Provides digit pattern analysis and predictions for trading
 */

class DigitAnalyzer {
    constructor() {
        this.recentDigits = [];
        this.patternMemory = new Map();
        this.maxMemorySize = 1000;
        this.maxPatternLength = 10;
        this.digitCounts = Array(10).fill(0);
        this.totalDigits = 0;
        
        // Add streak tracking
        this.currentStreak = { digit: null, count: 0 };
        this.streakHistory = [];
        this.maxStreakLength = 0;

        // Add analysis depth setting
        this.analysisDepth = 30; // Default value
        
        // Add dedicated analysis buffer
        this.analysisBuffer = [];
        
        // Logging settings - enable by default
        this.loggingEnabled = true; // Changed to true to enable logging by default
        
        // Log that the analyzer has been initialized
        console.log('%c DIGIT//MATCH Analyzer Initialized ', 'background: #222; color: #bada55; font-size: 14px;');
    }
    
    // Enable or disable logging
    setLogging(enabled) {
        this.loggingEnabled = Boolean(enabled);
        console.log(`Logging ${this.loggingEnabled ? 'enabled' : 'disabled'}`);
        return this.loggingEnabled;
    }
    
    addDigit(digit) {
        if (digit < 0 || digit > 9 || !Number.isInteger(digit)) {
            throw new Error("Digit must be an integer between 0 and 9");
        }
        
        // Add to recent digits
        this.recentDigits.push(digit);
        if (this.recentDigits.length > this.maxMemorySize) {
            this.recentDigits.shift();
        }
        
        // Update dedicated analysis buffer (exact size of analysisDepth)
        this.analysisBuffer.push(digit);
        if (this.analysisBuffer.length > this.analysisDepth) {
            this.analysisBuffer.shift();
        }
        
        // Update counts
        this.digitCounts[digit]++;
        this.totalDigits++;
        
        // If logging is enabled, log the current percentages
        if (this.loggingEnabled && this.analysisBuffer.length > 0) {
            // Log both overall and analysis buffer percentages
            console.log(`Added digit: ${digit}`);
            console.log("Analysis buffer:", this.analysisBuffer);
            
            // Count occurrences in analysis buffer
            const bufferCounts = Array(10).fill(0);
            for (const d of this.analysisBuffer) {
                bufferCounts[d]++;
            }
            
            // Calculate and log percentages from analysis buffer
            const bufferPercentages = bufferCounts.map(count => 
                (count / this.analysisBuffer.length * 100).toFixed(1)
            );
            
            console.log("Percentages from last", this.analysisBuffer.length, "digits:");
            for (let i = 0; i < 10; i++) {
                console.log(`${i} = ${bufferPercentages[i]}%`);
            }
        }
        
        // Track streaks
        if (digit === this.currentStreak.digit) {
            this.currentStreak.count++;
            if (this.currentStreak.count > this.maxStreakLength) {
                this.maxStreakLength = this.currentStreak.count;
            }
        } else {
            // Store previous streak if it was at least 2 digits
            if (this.currentStreak.count >= 2) {
                this.streakHistory.push({...this.currentStreak});
                // Keep history manageable
                if (this.streakHistory.length > 20) this.streakHistory.shift();
            }
            // Start new streak
            this.currentStreak = { digit: digit, count: 1 };
        }
        
        // Store patterns of varying lengths with improved capture
        for (let i = 2; i <= this.maxPatternLength; i++) {
            if (this.recentDigits.length >= i) {
                // Get the pattern (the digits that come before the result)
                const patternDigits = this.recentDigits.slice(-i-1, -1);
                const pattern = patternDigits.join('-');
                const result = this.recentDigits[this.recentDigits.length - 1];
                
                if (!this.patternMemory.has(pattern)) {
                    this.patternMemory.set(pattern, Array(10).fill(0));
                }
                
                const resultCounts = this.patternMemory.get(pattern);
                resultCounts[result]++;
            }
        }
        
        return digit;
    }
    
    // Get digit distribution as percentages
    getDistribution() {
        if (this.totalDigits === 0) return Array(10).fill(0);
        
        return this.digitCounts.map(count => (count / this.totalDigits) * 100);
    }
    
    // Set the analysis depth and resize the analysis buffer
    setAnalysisDepth(depth) {
        if (depth < 1) throw new Error("Analysis depth must be at least 1");
        this.analysisDepth = Math.floor(depth);
        
        // Resize the analysis buffer to match the new depth
        if (this.analysisBuffer.length > this.analysisDepth) {
            // Keep only the most recent digits up to the new depth
            this.analysisBuffer = this.analysisBuffer.slice(-this.analysisDepth);
        }
        
        return this.analysisDepth;
    }
    
    // Get frequency-based predictions from recent digits using the dedicated analysis buffer
    getFrequencyPredictions(customThreshold = 12) {
        // Use the analysis buffer which is always exactly the size of analysisDepth
        // or smaller if we haven't collected that many digits yet
        const count = this.analysisBuffer.length;
        
        if (count === 0) return { 
            distribution: [], 
            predictions: [],
            analysisDepth: this.analysisDepth,
            actualCount: 0
        };
        
        // Count occurrences of each digit in the analysis buffer
        const digitCounts = Array(10).fill(0);
        for (const digit of this.analysisBuffer) {
            digitCounts[digit]++;
        }
        
        // Calculate percentages
        const percentages = digitCounts.map(count => (count / this.analysisBuffer.length) * 100);
        
        // Create output with percentages for all digits (sorted by digit for consistency)
        const distribution = percentages.map((percentage, digit) => ({
            digit,
            percentage: parseFloat(percentage.toFixed(1)),
            count: digitCounts[digit],
            totalAnalyzed: this.analysisBuffer.length
        }));
        
        // Filter digits above threshold
        const predictions = distribution
            .filter(item => item.percentage > customThreshold)
            .sort((a, b) => b.percentage - a.percentage) // Sort by percentage descending
            .map(item => item.digit);
        
        return {
            distribution,
            predictions,
            analysisDepth: this.analysisDepth,
            actualCount: count,
            buffer: [...this.analysisBuffer]  // Return a copy of the buffer for diagnostics
        };
    }
    
    // Get prediction for the next digit based on recent pattern
    getPrediction(patternLength = 5) {
        if (this.recentDigits.length < patternLength) {
            return null;
        }
        
        const pattern = this.recentDigits.slice(-patternLength).join('-');
        const counts = this.patternMemory.get(pattern);
        
        if (!counts || counts.every(c => c === 0)) {
            return null;
        }
        
        // Calculate probabilities
        const total = counts.reduce((sum, count) => sum + count, 0);
        const probabilities = counts.map(count => (count / total) * 100);
        
        // Find the top 3 most likely digits
        const topDigits = [];
        for (let i = 0; i < 3; i++) {
            const maxProb = Math.max(...probabilities);
            const maxIndex = probabilities.indexOf(maxProb);
            
            topDigits.push({
                digit: maxIndex,
                probability: maxProb
            });
            
            // Set to -1 so it's not chosen again
            probabilities[maxIndex] = -1;
        }
        
        return topDigits;
    }
    
    // Get even/odd distribution
    getEvenOddDistribution() {
        if (this.totalDigits === 0) return { even: 50, odd: 50 };
        
        const evenDigits = [0, 2, 4, 6, 8];
        const evenCount = evenDigits.reduce((sum, digit) => sum + this.digitCounts[digit], 0);
        const oddCount = this.totalDigits - evenCount;
        
        return {
            even: (evenCount / this.totalDigits) * 100,
            odd: (oddCount / this.totalDigits) * 100
        };
    }
    
    // Get high/low distribution (relative to a reference, default 5)
    getHighLowDistribution(reference = 5) { // Ensure default value is set
        if (this.totalDigits === 0) return { high: 50, low: 50, equal: 0 };

        // Ensure reference is valid
        const validReference = Math.max(0, Math.min(9, Math.floor(reference)));

        let highCount = 0;
        let lowCount = 0;
        let equalCount = 0;

        for (let i = 0; i < 10; i++) {
            if (i > validReference) {
                highCount += this.digitCounts[i];
            } else if (i < validReference) {
                lowCount += this.digitCounts[i];
            } else {
                equalCount += this.digitCounts[i];
            }
        }

        // Avoid division by zero if totalDigits is somehow 0 here
        const total = this.totalDigits || 1;

        return {
            high: (highCount / total) * 100,
            low: (lowCount / total) * 100,
            equal: (equalCount / total) * 100
        };
    }
    
    // Get all recent streaks of repeating digits
    getStreaks() {
        return {
            current: this.currentStreak,
            history: this.streakHistory,
            max: this.maxStreakLength
        };
    }
    
    // Calculate confidence for a specific digit
    calculateDigitConfidence(digit) {
        if (this.totalDigits === 0 || digit < 0 || digit > 9) {
            return 0;
        }
        
        // Get the occurrence count for this digit
        const count = this.digitCounts[digit];
        if (count === 0) return 0;
        
        // Calculate the expected frequency in a random distribution
        const expectedFrequency = this.totalDigits / 10;
        
        // Calculate deviation from expected frequency
        const deviation = count / expectedFrequency;
        
        // Map deviation to confidence:
        // 1.0 = random distribution (0% confidence)
        // 2.0 = twice as frequent as random (100% confidence)
        let confidence = 0;
        if (deviation > 1) {
            confidence = Math.min(100, (deviation - 1) * 100);
        }
        
        // Adjust confidence based on sample size
        if (this.totalDigits < 50) {
            confidence *= (this.totalDigits / 50);
        }
        
        return Math.max(0, Math.min(100, confidence));
    }
    
    // Get digits with confidence values
    getDigitsWithConfidence() {
        const result = [];
        
        for (let i = 0; i < 10; i++) {
            result.push({
                digit: i,
                confidence: this.calculateDigitConfidence(i),
                frequency: this.totalDigits > 0 ? (this.digitCounts[i] / this.totalDigits) * 100 : 0
            });
        }
        
        return result.sort((a, b) => b.confidence - a.confidence);
    }
    
    // Log percentages of each digit
    logPercentages() {
        const distribution = this.getDistribution();
        console.log("Digit Percentages:", distribution.map((percentage, digit) => ({
            digit,
            percentage: parseFloat(percentage.toFixed(1))
        })));
    }
    
    // Reset all data
    reset() {
        this.recentDigits = [];
        this.patternMemory = new Map();
        this.digitCounts = Array(10).fill(0);
        this.totalDigits = 0;
        this.currentStreak = { digit: null, count: 0 };
        this.streakHistory = [];
        this.maxStreakLength = 0;
        this.analysisBuffer = []; // Clear the analysis buffer too
    }
}

// Expose to global scope
window.DigitAnalyzer = DigitAnalyzer;
