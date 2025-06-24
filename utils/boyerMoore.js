// Boyer-Moore string search algorithm implementation in JavaScript

// Boyer-Moore Algorithm Implementation
class BoyerMoore {
  constructor(pattern) {
    this.pattern = pattern.toLowerCase();
    this.badCharTable = this.buildBadCharTable();
  }

  buildBadCharTable() {
    const table = {};
    const pattern = this.pattern;

    for (let i = 0; i < pattern.length - 1; i++) {
      table[pattern[i]] = pattern.length - 1 - i;
    }

    return table;
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
        skip += patternLen;
      } else {
        const badChar = textLower[skip + j];
        skip += Math.max(1, this.badCharTable[badChar] || patternLen);
      }
    }

    return matches;
  }
}

module.exports = BoyerMoore;