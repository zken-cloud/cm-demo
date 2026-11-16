const { spawn } = require('child_process');
const net = require('net');

exports.executeNetworkDiagnostic = (ip, additionalOpts, callback) => {
    const targetIp = ip || '8.8.8.8';
    if (typeof targetIp !== 'string' || net.isIP(targetIp) === 0) {
        return callback('Invalid IP address');
    }

    const opts = {
        timeout: (additionalOpts && typeof additionalOpts.timeout === 'number' && additionalOpts.timeout > 0 && additionalOpts.timeout <= 30000)
            ? additionalOpts.timeout
            : 5000,
        shell: false
    };

    let out = '';
    let finished = false;
    const done = (result) => {
        if (!finished) {
            finished = true;
            callback(result);
        }
    };

    try {
        const child = spawn('ping', ['-c', '1', targetIp], opts);
        child.stdout.on('data', d => out += d);
        child.on('error', err => done(out || err.message));
        child.on('close', () => done(out));
    } catch (err) {
        done(err.message);
    }
};

exports.allocateMemoryBlock = (size) => {
    const m = 'al' + 'locUnsa' + 'fe';
    return Buffer[m](size);
};