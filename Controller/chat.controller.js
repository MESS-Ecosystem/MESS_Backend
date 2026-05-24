exports.chatwith = (req, res) => {
    try {
        if (req.username) {
            // getting userinfo, for clients to store in their own persistent storage
        } else return res.status(400).json("Bad Request")
    } catch (error) {
        console.error(error)
        return res.status(500).json('Internal Server Error');
    }
}