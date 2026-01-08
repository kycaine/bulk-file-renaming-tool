const MAJORITY_THRESHOLD = 0.70; 

function splitFilename(name) {
    const nameOnly = name.substring(0, name.lastIndexOf(".")) || name;
    return nameOnly.split(/[-_\.]/);
}

function detectDelimiter(name) {
    if (name.includes("-")) return "-";
    if (name.includes("_")) return "_";
    return ""; 
}

const isTokenDate = (token) => {
    const isYearValid = (yearStr) => {
        const year = parseInt(yearStr, 10);
        const currentYear = new Date().getFullYear();
        return year >= 2000 && year <= (currentYear + 1); 
    }

    if (token.match(/^(\d{4})(\d{2})(\d{2})$/)) {
        const yearStr = RegExp.$1;
        if (isYearValid(yearStr)) {
            return true;
        }
    } 
    
    if (token.match(/^(\d{4})[-_]\d{2}[-_]\d{2}$/)) {
        const yearStr = RegExp.$1;
        if (isYearValid(yearStr)) {
            return true;
        }
    }
    
    if (token.match(/^\d{8}[-_]\d{6}$/)) return true; 

    return false;
}

export function detectPattern(filenames) {
    if (filenames.length === 0) return null;

    const fileCount = filenames.length;
    
    const parts = filenames.map(splitFilename);
    
    const majorityLength = parts.reduce((max, p) => Math.max(max, p.length), 0);

    let stable = Array(majorityLength).fill(true);
    let majorityTokens = Array(majorityLength).fill('');
    let minorityCount = 0; 
    let dateTokenIndexes = [];
    let majorityDateTokens = {};

    for (let p = 0; p < majorityLength; p++) {
        const tokenMap = new Map();
        let maxFreq = 0;
        let mostCommonToken = '';

        for (const fileParts of parts) {
            const token = fileParts[p];
            if (token !== undefined) {
                tokenMap.set(token, (tokenMap.get(token) || 0) + 1);
                
                if (tokenMap.get(token) > maxFreq) {
                    maxFreq = tokenMap.get(token);
                    mostCommonToken = token;
                }
            }
        }
        
        majorityTokens[p] = mostCommonToken;

        if (maxFreq / fileCount < MAJORITY_THRESHOLD) {
            stable[p] = false; 
        }
    }
    
    for (let p = 0; p < majorityLength; p++) {
        if (isTokenDate(majorityTokens[p])) {
            let dateCount = 0;
            for (const fileParts of parts) {
                if (fileParts[p] !== undefined && isTokenDate(fileParts[p])) {
                    dateCount++;
                }
            }

            if (dateCount / fileCount >= MAJORITY_THRESHOLD) {
                dateTokenIndexes.push(p);
                majorityDateTokens[p] = majorityTokens[p];
            }
        }
    }

    for (const fileParts of parts) {
        let isMinority = false;
        
        if (fileParts.length !== majorityLength) {
            isMinority = true;
        } else {
            for (let p = 0; p < majorityLength; p++) {
                if (!dateTokenIndexes.includes(p) && stable[p] && fileParts[p] !== majorityTokens[p]) {
                    isMinority = true;
                    break;
                }
            }
        }
        
        if (isMinority) {
            minorityCount++;
        }
    }

    const variableIndexes = stable
        .map((s, i) => (!s && !dateTokenIndexes.includes(i)) ? i : null)
        .filter(v => v !== null);

    return {
        tokens: majorityTokens,
        variableIndexes: variableIndexes,
        delimiter: detectDelimiter(filenames[0]),

        isUniform: minorityCount === 0,
        minorityCount: minorityCount,

        dateTokenIndexes: dateTokenIndexes,
        majorityDateTokens: majorityDateTokens
    };
}