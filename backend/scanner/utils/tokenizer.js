export const tokenize = (content) => {
    // Split using spaces, quotes, =, :, := 
    // We want to extract potential secret strings.
    // We split by any of these delimiters and capture the tokens that are sufficiently long.
    const delimiterRegex = /[\s"'=:]+|:=/;
    return content.split(delimiterRegex).filter(token => token.length > 5);
};

export const findContextKeywords = (line) => {
    const contextKeywords = [
        'password', 'secret', 'token', 'apikey', 'key', 'credential', 'auth', 'api_key', 'private_key'
    ];
    const lowerLine = line.toLowerCase();
    
    for (const keyword of contextKeywords) {
        if (lowerLine.includes(keyword)) {
            return true;
        }
    }
    return false;
};
