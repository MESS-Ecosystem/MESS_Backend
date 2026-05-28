const express = require('express');
const Router = express.Router();
const root = require('../Controller/auth.controller')
const auth = require('../Middleware/auth.middleware')
Router.post('/login', root.login)
Router.post('/register', root.addUser);
Router.get('/verify', root.verify);
Router.get('/refresh', auth.verify, root.refreshToken);

module.exports = Router
