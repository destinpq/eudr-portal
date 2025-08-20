"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
var errorHandler = function (err, req, res, next) {
    console.error('Error:', err);
    if (err.name === 'UnauthorizedError') {
        res.status(401).json({ message: 'Invalid token' });
        return;
    }
    if (err.message === 'Not allowed by CORS') {
        res.status(403).json({ message: 'CORS error: Origin not allowed' });
        return;
    }
    res.status(500).json({ message: 'Internal server error' });
};
exports.errorHandler = errorHandler;
