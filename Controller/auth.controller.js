const userModel = require('../Model/user.model')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
exports.addUser = async (req, res) => {
    try {
        let { username, password, email, displayName, phone } = req.body;
        if (username && password && email) {
            username = username.trim().replaceAll(' ', '') // removing all spaces
            if (displayName === undefined || null) displayName = username
            if (phone == undefined) phone = null
            // console.log('STATUS: hashing password !!!!') 
            // password hashing takes about 2.7 - 2.8 seconds on 16Salt Rounds
            // calculated by log timestams in terminal, 
            // (tested on linux system, on 4.2GHz single thread operation) 
            password = await bcrypt.hash(password, 8)
            // console.log('STATUS: hashed password !!!!')

            // providing info too early to make the response time faster for frontend,
            // connectionstate = 1 == connected, just to make sure data will reach to database
            if (username && password && email && displayName && mongoose.connection.readyState == 1) res.status(201).json('user added successfully')
            //for searching
            let usernameLower = username.toString().toLowerCase()
            let userInfo = {
                phone,
                username,
                usernameLower,
                displayName,
                email, // hoping validation is done at frontend, will at here later
                password
            }
            console.log("DEV: ", userInfo)
            await userModel.create(userInfo)
            // console.log('data added in database, returning')
            return // to avoid potential overloading (or memory leak, if users expand), by ending running instance of req,res cycle
        } else return res.status(400).json('Insufficient Data') // 400 = bad request

    } catch (error) {
        console.error(error)
        return res.status(500).json('Internal Server Error')
    }
}
exports.login = async (req, res) => {
    try {

        let { username, email, password } = req.body;
        if (username.length >= 8 && password.length >= 8) {
            // let user = await userModel.findOne({ username: username }).select('-createdAt -updatedAt -__v -_id -email')
            username = username.trim().replaceAll(' ', '')
            let usernameLower = username.toString().toLowerCase()
            let user = await userModel.findOne({ usernameLower: usernameLower }).select('username password _id')
            if (!user) return res.status(401).json('Invalid Credentials');
            let isValid = await bcrypt.compare(password, user?.password);
            if (!isValid) return res.status(401).json('Invalid Credentials');
            if (isValid === true) {
                let jwttoken = jwt.sign({ username, _id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' })
                return res.json({ token: jwttoken });
            }
        } else if (email && password.length >= 8) {
            let user = await userModel.findOne({ email: email }).select('email password username _id')
            if (!user) return res.status(401).json('Invalid Credentials');
            let isValid = await bcrypt.compare(user?.password, password);
            if (!isValid) return res.status(401).json('Invalid Credentials');
            if (isValid === true) {
                let jwttoken = jwt.sign({ username, _id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' })
                return res.json({ token: jwttoken });
            }
        } else return res.status(401).json('Invalid Credentials');
    } catch (error) {
        console.error(error);
        return res.status(500).json('Internal Server Error');
    }
}
exports.verify = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.replace(/^Bearer\s+/, '');
        // console.log(token)
        let user = jwt.verify(token, process.env.JWT_SECRET)
        if (!user)
            return res.status(401).json('Unauthorized')
        else {
            // let useronDB = await userModel.findById(user._id);
            let exists = await userModel.exists({ _id: user._id }) // returns { _id } if found, or null
            if (exists) return res.status(200).json('Authorized')
            else return res.status(401).json('Unauthorized')
        }
    } catch (error) {
        console.error(error)
        return res.status(401).json('Unauthorized')
    }
}