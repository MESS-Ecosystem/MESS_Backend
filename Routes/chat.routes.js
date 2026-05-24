const mongoose = require('mongoose')
const Router = require('express').Router()
const root = require('../Controller/chat.controller')

Router.post('/to', root.chatwith)

module.exports = Router