const userModel = require("../Model/user.model")

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