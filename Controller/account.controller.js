const userModel = require("../Model/user.model")
const cloudinary = require('../Utils/cloudinary')

exports.getAccountInfo = async (req, res) => {
    try {
        if (req.token) {
            // console.log(req.token)
            let user = await userModel.findOne({ username: req.token.username })
            if (!user) return res.status(404).json("User not found")
            userInfo = {
                username: user.username,
                email: user.email,
                profile: user?.profile
            }
            return res.json(userInfo)
        }
        else return res.status(400).json("Bad Request")
    } catch (error) {
        console.error(error)
        return res.status(500).json('Internal Server Error');
    }
}

exports.addProfile = async (req, res) => {
    try {
        // console.log("DEV: ", req.file)
        if (req?.file) {
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
                // console.log(dbres)
                return;
            })
        } else if (req?.body?.profile) {
            cloudinary.uploader.upload(req.body.profile, async function (err, result) {
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
                // console.log(dbres)
                return;
            })
        }
    } catch (error) {
        console.error(error)
        return res.status(500).json("Internal Server Error")
    }
}

exports.editProfile = async (req, res) => {
    try {
        // console.log("DEV: FILE: ", req?.file)
        // console.log("DEV: BASE64", req?.body?.profile.toString().slice(0, 35))
        // if (req?.file) {
        //     cloudinary.uploader.upload(req.file.path, async function (err, result) {
        //         if (err) {
        //             console.error(err)
        //             return res.status(500).json({
        //                 success: false,
        //                 message: "Error"
        //             })
        //         }
        //         res.json({
        //             success: true,
        //             message: "Uploaded",
        //             data: result
        //         })
        //         const objectId = req.token._id
        //         // console.log(objectId)
        //         let dbres = await userModel.findByIdAndUpdate(objectId, { profile: result.secure_url }, { returnDocument: 'before' })
        //         // console.log(dbres)
        //         // cleaning up old image
        //         if (dbres.profile) {
        //             let url = dbres.profile
        //             console.log(url)
        //             const publicId = url.split('/').slice(-2).join('/').split('.')[0];
        //             cloudinary.uploader.destroy(publicId, { invalidate: true }, (error, result) => {
        //                 console.log(result, error);
        //             });
        //         }
        //         return;
        //     })
        // }
        if (req?.file) {
            const objectId = req.token._id
            const publicId = `users/${objectId}/profile`
            cloudinary.uploader.upload(req.file.path, {
                public_id: publicId,
                overwrite: true,
                invalidate: true,
                resource_type: 'image'
            }, async function (err, result) {
                if (err) {
                    console.error(err)
                    return res.status(500).json({
                        success: false,
                        message: "Error"
                    })
                }
                await userModel.findByIdAndUpdate(objectId, { profile: result.secure_url })
                return res.json({
                    success: true,
                    message: "Uploaded",
                    data: result
                })
            }
            )
        }
        // else if (req?.body?.profile) {
        //     cloudinary.uploader.upload(req?.body?.profile, async function (err, result) {
        //         if (err) {
        //             console.error(err)
        //             return res.status(500).json({
        //                 success: false,
        //                 message: "Error"
        //             })
        //         }
        //         res.json({
        //             success: true,
        //             message: "Uploaded",
        //             data: result
        //         })
        //         const objectId = req.token._id
        //         // console.log(objectId)
        //         let dbres = await userModel.findByIdAndUpdate(objectId, { profile: result.secure_url }, { returnDocument: 'before' })
        //         if (dbres.profile) {
        //             let url = dbres.profile
        //             // cleaning up old image
        //             console.log(url)
        //             const publicId = url.split('/').slice(-2).join('/').split('.')[0];
        //             cloudinary.uploader.destroy(publicId, { invalidate: true }, (error, result) => {
        //                 console.log(result, error);
        //             });
        //         }
        //         return;
        //     })
        // }
        else if (req?.body?.profile) {
            const objectId = req.token._id
            const publicId = `users/${objectId}/${req.token.username}`
            cloudinary.uploader.upload(req?.body?.profile, {
                public_id: publicId,
                overwrite: true,
                invalidate: true,
                resource_type: 'image'
            }, async function (err, result) {
                if (err) {
                    console.error(err)
                    return res.status(500).json({
                        success: false,
                        message: "Error"
                    })
                }
                await userModel.findByIdAndUpdate(objectId, { profile: result.secure_url })
                return res.json({
                    success: true,
                    message: "Uploaded",
                    data: result
                })
            })
        }
        else return res.status(400).json("Bad Request")
    } catch (error) {
        console.error(error)
        return res.status(500).json("Internal Server Error")
    }
}

exports.searchUsername = async (req, res) => {
    try {
        let username = req.query.username
        if (username) {

            // instructed frontend to make username lowercase before request, but using this as a fallback
            username = username.toString().toLowerCase()
            username = username.trim().replaceAll(' ', '')

            const userInfo = await userModel.find({
                usernameLower: {
                    $regex: `^${username}`
                }
            }).select('username email profile phone _id').limit(5)
            if (userInfo) {
                return res.json(userInfo)
            } else return res.status(404).json("User not found")
        } else return res.status(400).json("Bad Request")
    } catch (error) {
        console.error(error)
        return res.status(500).json("Internal Server Error");
    }
}
exports.searchPhone = async (req, res) => {
    try {
        let phone = req.query.phone
        if (phone) {

            // instructed frontend to make username lowercase before request, but using this as a fallback
            phone = phone.toString().toLowerCase()
            phone = phone.trim().replaceAll(' ', '')
            // console.log(phone)
            if (phone.length == 10) {
                const userInfo = await userModel.findOne({ phone: parseInt(phone) })
                    .select('username email profile phone _id')
                // console.log(userInfo)
                if (userInfo) {
                    return res.json(userInfo)
                } else return res.status(404).json("User not found 1")
            } else if (phone.length == 13 || phone.length == 12 || phone.startsWith('+')) {
                phone = phone.replace('+', '')
                const userInfo = await userModel.findOne({ phone: parseInt(phone) })
                    .select('username email profile phone _id')
                // console.log(userInfo)
                if (userInfo) {
                    return res.json(userInfo)
                } else return res.status(404).json("User not found 2")
            } else return res.status(404).json("User not found3 ")
        } else return res.status(404).json("User not found4")
    } catch (error) {
        console.error(error)
        return res.status(500).json("Internal Server Error");
    }
}