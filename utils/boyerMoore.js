// Boyer-Moore string search algorithm implementation in JavaScript

// Boyer-Moore Algorithm Implementation
class BoyerMoore {
  constructor(pattern) {
    this.pattern = pattern.toLowerCase();
    this.badCharTable = this.buildBadCharTable();
    this.goodSuffixTable = this.buildGoodSuffixTable();
  }

  buildBadCharTable() {
    const table = {};
    const pattern = this.pattern;

    for (let i = 0; i < pattern.length; i++) {
      table[pattern[i]] = pattern.length - 1 - i;
    }

    return table;
  }

  buildGoodSuffixTable() {
    const pattern = this.pattern;
    const m = pattern.length;
    const goodSuffixTable = new Array(m + 1).fill(0);
    const border = new Array(m + 1).fill(0);

    let i = m, j = m + 1;
    border[i] = j;

    while (i > 0) {
      while (j <= m && pattern[i - 1] !== pattern[j - 1]) {
        if (goodSuffixTable[j] === 0) {
          goodSuffixTable[j] = j - i;
        }
        j = border[j];
      }
      i--;
      j--;
      border[i] = j;
    }

    for (let i = 0; i <= m; i++) {
      if (goodSuffixTable[i] === 0) {
        goodSuffixTable[i] = j;
      }
      if (i === j) {
        j = border[j];
      }
    }

    return goodSuffixTable.slice(1);
  }

  search(text) {
    const textLower = text.toLowerCase();
    const pattern = this.pattern;
    const textLen = textLower.length;
    const patternLen = pattern.length;

    if (patternLen === 0) return [];

    const matches = [];
    let skip = 0;

    while (skip <= textLen - patternLen) {
      let j = patternLen - 1;

      while (j >= 0 && pattern[j] === textLower[skip + j]) {
        j--;
      }

      if (j < 0) {
        matches.push(skip);
        return matches; // Exit after first match found
      } else {
        const badChar = textLower[skip + j];
        const badCharShift = this.badCharTable[badChar] !== undefined
          ? this.badCharTable[badChar] - (patternLen - 1 - j)
          : patternLen;
        const goodSuffixShift = this.goodSuffixTable[j];
        skip += Math.max(1, badCharShift, goodSuffixShift);
      }
    }

    return matches;
  }
}

module.exports = BoyerMoore;