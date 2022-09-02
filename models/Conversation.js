const mongoose = require("mongoose")

const conversationSchema = new mongoose.Schema({
    participants: [String],
})


const db = mongoose.connection.useDb("chat")
const Conversation = db.model("Conversation", conversationSchema)

module.exports = Conversation
