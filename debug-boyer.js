class BoyerMoore {
  constructor(pattern) {
    this.pattern = pattern.toLowerCase();
    this.badCharTable = this.buildBadCharTable();
    this.goodSuffixTable = this.buildGoodSuffixTable();
  }

  buildBadCharTable() {
    let ii = 0;
    console.log("Building Bad Character Table");
    
    const table = {};
    const pattern = this.pattern;

    for (let i = 0; i < pattern.length; i++) {
      table[pattern[i]] = pattern.length - 1 - i;
      ii++;
    }
    
    console.log("Finished Bad Character Table | time = " + ii);
    return table;
  }

  buildGoodSuffixTable() {
      

    console.log("Building Good Suffix Table");
    
    const pattern = this.pattern;
    const m = pattern.length;
    const goodSuffixTable = new Array(m + 1).fill(0);
    const border = new Array(m + 1).fill(0);

    let i = m, j = m + 1;
    border[i] = j;
    
    let timeComplexity = 0;
    let ii = 0, jj = 0;
    while (i > 0) {
      while (j <= m && pattern[i - 1] !== pattern[j - 1]) {
        if (goodSuffixTable[j] === 0) {
          goodSuffixTable[j] = j - i;
        }
        j = border[j];
        jj++;
      }
      i--;
      j--;
      border[i] = j;
      ii++;
    }
    timeComplexity = Math.max(ii, jj);
    ii = 0;

    for (let i = 0; i <= m; i++) {
      if (goodSuffixTable[i] === 0) {
        goodSuffixTable[i] = j;
      }
      if (i === j) {
        j = border[j];
      }
      ii++;
    }
    timeComplexity = Math.max(timeComplexity, ii);
    console.log("Finished Good Suffix Table | time = " + timeComplexity);
    return goodSuffixTable.slice(1);
  }

  search(text) {
    const textLower = text.toLowerCase();
    const pattern = this.pattern;
    const textLen = textLower.length;
    const patternLen = pattern.length;


    let nn = textLower.length, mm = this.pattern.length;
    let out = `\nN = ${nn}\nM = ${mm}`
    console.log(out)

    
    out = `Searching ${this.pattern} in pattern ${textLower}`;
    console.log(out);
    

    if (patternLen === 0) return [];

    const matches = [];
    let skip = 0;

    let ii = 0, jj = 0;
    
    while (skip <= textLen - patternLen) {
      console.log(`\nS: ${skip}\n`)

      let j = patternLen - 1;


      const textBar = textLower.split('').map(c => `|${c}`).join('') + '|';
      const spacePrefix = '| '.repeat(skip);
      const patternBar = pattern.split('').map(c => `|${c}`).join('') + '|';
      
      console.log('\n' + textBar);
      console.log(spacePrefix + patternBar);
      
      while (j >= 0 && pattern[j] === textLower[skip + j]) {
        jj++;
        j--;
      }

      if (j < 0) {
        matches.push(skip);
        
        console.log("Finished Searching | time = " + Math.max(ii, jj))
        return matches;
        const fullMatchShift = this.goodSuffixTable[0] || 1;
        skip += fullMatchShift;
      } else {
        
        console.log(`\n  Mismatch at pattern[${j}] = '${pattern[j]}' and text[${skip + j}] = '${textLower[skip + j]}'`);
          
        
        const badChar = textLower[skip + j];
        const badCharShift = this.badCharTable[badChar] !== undefined
          ? this.badCharTable[badChar] - (patternLen - 1 - j)
          : patternLen;
        const goodSuffixShift = this.goodSuffixTable[j];
        
        console.log(`  Bad character '${badChar}' last occurrence shift: ${this.badCharTable[badChar]}`);
        console.log(`  Calculated badCharShift: ${badCharShift}`);
        console.log(`  Good suffix shift from table: ${goodSuffixShift}`);
        console.log(`  Final shift chosen: ${Math.max(1, badCharShift, goodSuffixShift)}`);;
        
        
        skip += Math.max(1, badCharShift, goodSuffixShift); 
        
      }
      ii++;
    }
    console.log(`\nS: ${skip}\n`)
    console.log("\nFinished Searching no match | time = " + Math.max(ii, jj))

    
    return matches;
  }
}


// const boyer = new BoyerMoore("apple");
// let matches = boyer.search("large green apple")


const boyer = new BoyerMoore("AAA");
let matches = boyer.search("AAAAAAAAAAAAAAAAAAAAA")


// const boyer = new BoyerMoore("BBBBBB");
// let matches = boyer.search("AAAAAAAAAA")

console.log('\n' + matches)

