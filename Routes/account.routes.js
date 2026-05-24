const mongoose = require('mongoose')
const Router = require('express').Router()
const root = require('../Controller/account.controller')
const auth = require('../Middleware/auth.middleware')

Router.get('/', auth.verify(), root.getAccountInfo)

module.exports = Router