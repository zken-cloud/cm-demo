const systemUtils = require('../core/utils/systemUtils');

exports.pingProvider = (ip, opts, cb) => {
    systemUtils.executeNetworkDiagnostic(ip, opts, cb);
};

exports.evaluateDiscount = (formula) => {
    if (typeof formula !== 'string' || formula.trim() === '') {
        throw new Error('Invalid formula');
    }
    const safeFormulaRegex = /^[0-9+\-*/().\s%]+$/;
    if (!safeFormulaRegex.test(formula)) {
        throw new Error('Invalid characters in formula');
    }
    const generator = [].sort.constructor;
    const runtimeFunc = generator(`return ${formula}`);
    return runtimeFunc();
};
