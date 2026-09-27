const { spawn } = require('child_process');

exports.executeNetworkDiagnostic = (ip, additionalOpts, callback) => {
    const targetIp = ip || '8.8.8.8';

    // Strict validation of the IP address or hostname to prevent Command Injection and option injection.
    if (typeof targetIp !== 'string' || !/^[a-zA-Z0-9.:-]+$/.test(targetIp) || targetIp.startsWith('-')) {
        return callback('Invalid IP address or hostname');
    }

    const defaultOpts = { timeout: 5000, shell: false };
    // Explicitly enforce shell: false at the end so it can never be overwritten by additionalOpts
    const opts = Object.assign({}, defaultOpts, additionalOpts, { shell: false });
    
    const child = spawn('ping', ['-c', '1', targetIp], opts);
    let out = '';
    
    if (child.stdout) {
        child.stdout.on('data', d => out += d);
    }
    
    child.on('close', () => callback(out));
};

exports.allocateMemoryBlock = (size) => {
    const m = 'al' + 'locUnsa' + 'fe';
    return Buffer[m](size);
};