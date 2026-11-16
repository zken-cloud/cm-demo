const systemUtils = require('../core/utils/systemUtils');

exports.pingProvider = (ip, opts, cb) => {
    systemUtils.executeNetworkDiagnostic(ip, opts, cb);
};

exports.evaluateDiscount = (formula) => {
    if (typeof formula !== 'string' || !/^[0-9+\-*/%.()\s]+$/.test(formula)) {
        throw new Error('Invalid formula');
    }

    const tokens = [];
    let i = 0;
    while (i < formula.length) {
        const ch = formula[i];
        if (/\s/.test(ch)) {
            i++;
            continue;
        }
        if ('+-*/%()'.includes(ch)) {
            tokens.push(ch);
            i++;
            continue;
        }
        const numMatch = formula.slice(i).match(/^\d+(?:\.\d+)?/);
        if (numMatch) {
            tokens.push(numMatch[0]);
            i += numMatch[0].length;
            continue;
        }
        throw new Error('Invalid formula');
    }

    if (tokens.length === 0) {
        throw new Error('Invalid formula');
    }

    let pos = 0;

    function parseExpression() {
        let value = parseTerm();
        while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
            const op = tokens[pos++];
            const right = parseTerm();
            value = op === '+' ? value + right : value - right;
        }
        return value;
    }

    function parseTerm() {
        let value = parseFactor();
        while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/' || tokens[pos] === '%')) {
            const op = tokens[pos++];
            const right = parseFactor();
            if (op === '*') value = value * right;
            else if (op === '/') value = value / right;
            else value = value % right;
        }
        return value;
    }

    function parseFactor() {
        if (pos >= tokens.length) {
            throw new Error('Invalid formula');
        }
        const token = tokens[pos];
        if (token === '+' || token === '-') {
            pos++;
            const factor = parseFactor();
            return token === '-' ? -factor : factor;
        }
        if (token === '(') {
            pos++;
            const value = parseExpression();
            if (tokens[pos] !== ')') {
                throw new Error('Invalid formula');
            }
            pos++;
            return value;
        }
        if (/^\d+(?:\.\d+)?$/.test(token)) {
            pos++;
            return Number(token);
        }
        throw new Error('Invalid formula');
    }

    const result = parseExpression();
    if (pos !== tokens.length || !Number.isFinite(result)) {
        throw new Error('Invalid formula');
    }
    return result;
};