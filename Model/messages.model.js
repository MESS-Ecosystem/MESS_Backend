const mongoose = require('mongoose');
const messageSchema = mongoose.Schema({
    chatId: {
        // hashed id of room
        // used for finding messages, for each chat
        type: String,
        required: true
    },
    senderName: {
        type: String,
        required: true,
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
    },
    content: {
        type: String,
        required: true,
    }
}, {
    timestamps: true
})

module.exports = mongoose.model('messages', messageSchema);