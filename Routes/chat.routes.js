const mongoose = require('mongoose')
const Router = require('express').Router()
const root = require('../Controller/chat.controller')

// with path param
Router.get('/info/:username', root.getUserinfo)
// with query param
Router.get('/info', root.getUserinfo)

module.exports = Router