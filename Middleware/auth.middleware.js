const jwt = require('jsonwebtoken')
exports.verify = async (req, res, next) => {
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
            if (exists) next();
            else return res.status(401).json('Unauthorized')
        }
    } catch (error) {
        console.error(error)
        return res.status(401).json('Unauthorized')
    }
}