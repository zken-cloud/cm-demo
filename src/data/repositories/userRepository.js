const usersDB = { '1001': { id: '1001', name: 'Alice', role: 'customer', balance: 50.0 } };

const ALLOWED_UPDATE_FIELDS = ['name'];

exports.updateUser = (id, payload) => {
    const user = usersDB[id];
    if (!user) return null;
    if (!payload || typeof payload !== 'object') return user;

    ALLOWED_UPDATE_FIELDS.forEach(field => {
        if (Object.prototype.hasOwnProperty.call(payload, field) && payload[field] !== undefined) {
            user[field] = payload[field];
        }
    });
    return user;
};