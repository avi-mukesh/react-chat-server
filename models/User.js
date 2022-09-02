const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
    username: String,
    refreshToken: String,
})

const db = mongoose.connection.useDb("chat")
const User = db.model("User", userSchema)
module.exports = User
