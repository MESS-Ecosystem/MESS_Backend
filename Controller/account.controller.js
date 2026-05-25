const userModel = require("../Model/user.model")
const cloudinary = require('../Utils/cloudinary')

exports.getAccountInfo = (req, res) => {
    try {
        if (req?.username) {
            if (req.username.length >= 8) {
                let user = userModel.findOne({ username: username })
                if (!user) return res.status(404).json("User not found")
                userInfo = {
                    username: user.username,
                    email: user.email,
                    profile: user?.profile
                }
                return res.json(userInfo)
            } else return res.status(400).json("Bad Request")
        } else if (req?.token || req?.auth?.token) { // own account's info

        }
        else return res.status(400).json("Bad Request")
    } catch (error) {
        console.error(error)
        return res.status(500).json('Internal Server Error');
    }
}

exports.addProfile = async (req, res) => {
    try {
        console.log("DEV: ", req.file)
        cloudinary.uploader.upload(req.file.path, async function (err, result) {
            if (err) {
                console.error(err)
                return res.status(500).json({
                    success: false,
                    message: "Error"
                })
            }
            res.json({
                success: true,
                message: "Uploaded",
                data: result
            })
            const objectId = req.token._id
            // console.log(objectId)
            let dbres = await userModel.findByIdAndUpdate(objectId, { profile: result.secure_url }, { new: true })
            console.log(dbres)
            return;
        })
    } catch (error) {
        console.error(error)
        return res.status(500).json("Internal Server Error")
    }
}