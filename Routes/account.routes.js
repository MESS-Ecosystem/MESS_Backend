const mongoose = require('mongoose')
const Router = require('express').Router()
const root = require('../Controller/account.controller')
const auth = require('../Middleware/auth.middleware')
const multer = require('../Middleware/multer')

Router.get('/', auth.verify, root.getAccountInfo)
// addProfile == add profile image for user
// no specification for user, will be added to the user found from AUTHTOKEN
Router.post('/profile', auth.verify, multer.single('profile'), root.addProfile) 
Router.patch('/profile', auth.verify, multer.single('profile'), root.editProfile) 
Router.get('/search', auth.verify, root.searchUsername)
Router.get('/searchByPhone', auth.verify, root.searchPhone)

module.exports = Router