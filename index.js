const express = require("express")
const app = express()
require("./dbconfig")
const jwt = require("jsonwebtoken")
const cookieParser = require("cookie-parser")
const server = require("http").createServer(app)

const io = require("socket.io")(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
    },
})

app.use(
    require("cors")({
        credentials: true,
        origin: "http://localhost:3000",
    })
)
app.use(express.json())
app.use(cookieParser())
app.set("json spaces", 2)

const User = require("./models/User")
const Message = require("./models/Message")

const consts = require("./consts")

app.get("/", (req, res) => {
    res.json({ message: "hello world" })
})

app.get("/messages", authenticateToken, async (req, res) => {
    const messages = await Message.find()

    res.json({
        messages: messages.filter(
            (m) =>
                Date.parse(m.createdAt) + consts.MESSAGE_EXPIRY_TIME >=
                Date.now()
        ),
    })
})

app.post("/send_message", authenticateToken, (req, res) => {
    const { username } = req
    const messageContent = req.body.message

    let message = new Message({
        sender: username,
        content: messageContent,
        createdAt: Date.now(),
    })
    message.save()

    res.json({ message })
})

// CHANGE SO THAT WE STORE REFRESH TOKEN WITH EACH USER AS WELL

app.post("/enter_chat", async (req, res) => {
    const username = req.body.username

    const docs = await User.find({ username })
    if (docs.length) {
        return res.status(409).json({ error: "Username already in use" })
    }

    const accessToken = generateAccessToken(username)
    const refreshToken = generateRefreshToken(username)

    const user = new User({ username, refreshToken })
    await user.save()

    res.cookie("refreshtoken", refreshToken, {
        httpOnly: true,
        path: "/refresh_token",
    })
    return res.json({ accessToken: accessToken })
})

app.post("/refresh_token", async (req, res) => {
    const refreshTokenCookie = req.cookies.refreshtoken

    // if we don't have a token in our request e.g. we've signed out (which clears the refreshtoken cookie)
    if (!refreshTokenCookie) {
        return res.json({ accessToken: "" })
    }
    // we have a token, let's verify it
    let payload = null
    try {
        payload = jwt.verify(
            refreshTokenCookie,
            process.env.REFRESH_TOKEN_SECRET
        )
    } catch (err) {
        return res.status(401).json({ accessToken: "" })
    }

    // token is valid so check if user with this refreshToken exists
    const docs = await User.find({ refreshToken: refreshTokenCookie })
    if (docs.length) {
        const accessToken = generateAccessToken(payload.username)
        return res.json({
            username: docs[0].username,
            accessToken: accessToken,
        })
    }
})

app.delete("/exit_chat", authenticateToken, async (req, res) => {
    // if (!req.cookies?.refreshtoken) return res.sendStatus(204) //no content

    res.clearCookie("refreshtoken", { path: "/refresh_token" })
    const response = await User.findOneAndDelete({ username: req.username })

    res.json({ message: "Signed out" })
})

const generateToken = (username, secret, expiresIn) => {
    let obj = { username }
    return jwt.sign(obj, secret, { expiresIn })
}

const generateAccessToken = (username) => {
    return generateToken(username, process.env.ACCESS_TOKEN_SECRET, "5m")
}
const generateRefreshToken = (username) => {
    return generateToken(username, process.env.REFRESH_TOKEN_SECRET, "7d")
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"]
    const token = authHeader && authHeader.split(" ")[1]
    if (token == null) {
        return res.status(401).json({ message: "Unauthorized: no token" })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, payload) => {
        // 403 means we see u have a token but it's no longer valid
        if (err) {
            return res
                .status(403)
                .json({ message: "Forbidden: token has expired" })
        }

        req.username = payload.username
        next()
    })
}

io.on("connection", (socket) => {
    socket.on("newmessage", () => {
        io.emit("newmessage")
    })
})

server.listen(5000)
