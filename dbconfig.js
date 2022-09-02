const mongoose = require("mongoose")
require("dotenv").config()


mongoose.connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
const db = mongoose.connection.useDb('chat')

db.on("error", (error) => console.log(error))
db.on("open", () => {
    console.log("Connected to database")
})

module.exports = db
