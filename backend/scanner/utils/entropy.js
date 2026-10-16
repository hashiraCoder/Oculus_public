export const calculateShannonEntropy = (str) => {
    if (!str || str.length === 0) return 0;
    
    const frequencies = {};
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        frequencies[char] = (frequencies[char] || 0) + 1;
    }

    let entropy = 0;
    const len = str.length;
    
    for (const char in frequencies) {
        const p = frequencies[char] / len;
        entropy -= p * Math.log2(p);
    }
    
    return entropy;
};
