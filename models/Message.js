const consts = require("../consts")

const mongoose = require("mongoose")

const messageSchema = new mongoose.Schema({
    sender: String,
    content: String,
    createdAt: {
        type: Date,
        default: Date.now,
        expires: consts.MESSAGE_EXPIRY_TIME / 1000,
    },
    // conversationID: Number,
})

const db = mongoose.connection.useDb("chat")
const Message = db.model("Message", messageSchema)
module.exports = Message
