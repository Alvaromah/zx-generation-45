/**
 * Trace Analyzer
 * Analyzes instruction traces to detect loops and patterns
 */

export class TraceAnalyzer {
  /**
   * Format trace entry as human-readable string
   */
  static formatEntry(entry) {
    const pc = entry.pc.toString(16).padStart(4, '0').toUpperCase();
    const opcode = entry.opcode.toString(16).padStart(2, '0').toUpperCase();
    const af = entry.af.toString(16).padStart(4, '0').toUpperCase();
    const bc = entry.bc.toString(16).padStart(4, '0').toUpperCase();
    const de = entry.de.toString(16).padStart(4, '0').toUpperCase();
    const hl = entry.hl.toString(16).padStart(4, '0').toUpperCase();
    const sp = entry.sp.toString(16).padStart(4, '0').toUpperCase();
    const ix = entry.ix.toString(16).padStart(4, '0').toUpperCase();
    const iy = entry.iy.toString(16).padStart(4, '0').toUpperCase();

    let prefix = entry.prefix ? `${entry.prefix} ` : '';
    let memHL = entry.memHL !== undefined ? ` (HL)=${entry.memHL.toString(16).padStart(2, '0').toUpperCase()}` : '';
    return `${entry.count.toString().padStart(6)} | ${pc}: ${prefix}${opcode} | AF:${af} BC:${bc} DE:${de} HL:${hl} SP:${sp} IX:${ix} IY:${iy}${memHL} | T:${entry.tstates}`;
  }

  /**
   * Format trace log as string
   */
  static formatTrace(traceLog, startIndex = 0, count = 50) {
    const start = Math.max(0, startIndex);
    const end = Math.min(traceLog.length, start + count);

    let result = 'Count  | PC   Opcode | Registers                                                          | T-States\n';
    result += '-------|-------------|--------------------------------------------------------------------|---------\n';

    for (let i = start; i < end; i++) {
      result += this.formatEntry(traceLog[i]) + '\n';
    }

    return result;
  }

  /**
   * Detect tight loops (same PC repeated)
   */
  static detectTightLoops(traceLog, minRepeat = 3) {
    const loops = [];
    let currentPC = null;
    let repeatCount = 0;
    let startIndex = 0;

    for (let i = 0; i < traceLog.length; i++) {
      const entry = traceLog[i];

      if (entry.pc === currentPC) {
        repeatCount++;
      } else {
        if (repeatCount >= minRepeat) {
          loops.push({
            pc: currentPC,
            startIndex: startIndex,
            endIndex: i - 1,
            count: repeatCount
          });
        }
        currentPC = entry.pc;
        repeatCount = 1;
        startIndex = i;
      }
    }

    // Check last sequence
    if (repeatCount >= minRepeat) {
      loops.push({
        pc: currentPC,
        startIndex: startIndex,
        endIndex: traceLog.length - 1,
        count: repeatCount
      });
    }

    return loops;
  }

  /**
   * Detect repeating patterns of PC values
   */
  static detectPatternLoops(traceLog, maxPatternLength = 10, minRepeat = 3) {
    const patterns = [];

    for (let patternLen = 2; patternLen <= maxPatternLength; patternLen++) {
      for (let i = 0; i < traceLog.length - patternLen * minRepeat; i++) {
        // Get candidate pattern
        const pattern = [];
        for (let j = 0; j < patternLen; j++) {
          pattern.push(traceLog[i + j].pc);
        }

        // Check how many times it repeats
        let repeatCount = 1;
        let pos = i + patternLen;

        while (pos + patternLen <= traceLog.length) {
          let matches = true;
          for (let j = 0; j < patternLen; j++) {
            if (traceLog[pos + j].pc !== pattern[j]) {
              matches = false;
              break;
            }
          }

          if (matches) {
            repeatCount++;
            pos += patternLen;
          } else {
            break;
          }
        }

        if (repeatCount >= minRepeat) {
          patterns.push({
            pattern: pattern.map(pc => pc.toString(16).padStart(4, '0').toUpperCase()),
            patternLength: patternLen,
            startIndex: i,
            repeatCount: repeatCount,
            totalInstructions: patternLen * repeatCount
          });

          // Skip past this pattern
          i += patternLen * repeatCount - 1;
          break;
        }
      }
    }

    return patterns;
  }

  /**
   * Analyze trace for infinite loops
   */
  static analyzeForLoops(traceLog) {
    const result = {
      totalInstructions: traceLog.length,
      tightLoops: this.detectTightLoops(traceLog),
      patternLoops: this.detectPatternLoops(traceLog)
    };

    // If last 20% of trace is a loop, likely stuck
    const lastTenth = traceLog.slice(-Math.floor(traceLog.length * 0.2));
    if (lastTenth.length > 0) {
      const lastLoops = this.detectPatternLoops(lastTenth, 10, 2);
      result.likelyStuck = lastLoops.length > 0;
      result.stuckPattern = lastLoops[0] || null;
    }

    return result;
  }

  /**
   * Print loop analysis
   */
  static printLoopAnalysis(analysis) {
    console.log('\n=== TRACE ANALYSIS ===');
    console.log(`Total instructions: ${analysis.totalInstructions}`);

    if (analysis.tightLoops.length > 0) {
      console.log('\nTight loops detected:');
      analysis.tightLoops.forEach(loop => {
        console.log(`  PC: 0x${loop.pc.toString(16).padStart(4, '0')} - repeated ${loop.count} times`);
      });
    }

    if (analysis.patternLoops.length > 0) {
      console.log('\nPattern loops detected:');
      analysis.patternLoops.forEach(loop => {
        console.log(`  Pattern: [${loop.pattern.join(' -> ')}]`);
        console.log(`  Repeated: ${loop.repeatCount} times (${loop.totalInstructions} instructions)`);
      });
    }

    if (analysis.likelyStuck) {
      console.log('\n⚠️  LIKELY STUCK IN INFINITE LOOP!');
      if (analysis.stuckPattern) {
        console.log(`  Pattern: [${analysis.stuckPattern.pattern.join(' -> ')}]`);
      }
    }
  }

  /**
   * Get last N instructions
   */
  static getLastInstructions(traceLog, count = 50) {
    const start = Math.max(0, traceLog.length - count);
    return this.formatTrace(traceLog, start);
  }
}
