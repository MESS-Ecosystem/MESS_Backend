const userModel = require("../Model/user.model")

exports.getUserinfo = async (req, res) => {
    try {

        const fetchUser = async (username) => {
            try {
                const userInfo = await userModel.findOne({ username: username }).select('username email profile phone')
                console.log("DEV: ", userInfo)
                if (userInfo) {
                    return res.status(200).json(userInfo)
                } else return res.status(404).json("User not found")
            } catch (error) {
                console.error(error);
                return res.status(500).json('Internal Server Error')
            }
        }


        if (req.query.username) {
            fetchUser(req.query.username)
        } else if (req.params.username) {
            fetchUser(req.params.username)
        } else return res.status(400).json("Bad Request")
    } catch (error) {
        console.error(error)
        return res.status(500).json('Internal Server Error');
    }
}