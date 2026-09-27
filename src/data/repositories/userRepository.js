const usersDB = { '1001': { id: '1001', name: 'Alice', role: 'customer', balance: 50.0 } };

const ALLOWED_FIELDS = ['name'];

exports.updateUser = (id, payload) => {
    const user = usersDB[id];
    if (!user) return null;
    
    ALLOWED_FIELDS.forEach(field => {
        if (payload && payload[field] !== undefined) {
            user[field] = payload[field];
        }
    });
    return user;
};
