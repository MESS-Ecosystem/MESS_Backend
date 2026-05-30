require('dotenv').config()
const express = require('express');
const database = require('./Config/databaseconfig');
const server = express();
const cors = require('cors');
const cookie = require('cookie');
const socketio = require('socket.io');
const { instrument } = require('@socket.io/admin-ui')
const socketServer = require('http').createServer(server);
const messagesModel = require('./Model/messages.model');
const { verify, decode } = require('jsonwebtoken');
const PORT = process.env.PORT || 8080;
const cloudinary = require('cloudinary')
const io = socketio(socketServer, {
    cors: {
        // origin: ['http://localhost:3000', 'https://admin.socket.io', 'http://192.168.5.182:3000'],
        origin: '*',
        methods: ["GET", "POST"],
        // credentials: true
    }
})
server.use(cors({
    origin: '*',
    // credentials: true
}));

instrument(io, {
    auth: {
        type: 'basic',
        username: 'khushcodes',
        password: '$2a$12$/IOHn.9MzzZ2S3UoaFdM5OhYHopkFqNin6EibPKyyBy/IROeZZgkG'
    },
    mode: 'development'
})

database();

server.use(express.urlencoded({ limit: '100mb' }));
server.use(express.json({ limit: '100mb' }));
server.use('/auth', require('./Routes/auth.routes'))
server.use('/user', require('./Routes/chat.routes'))
server.use('/account', require('./Routes/account.routes'))
server.use('/', require('./Routes/index.routes'))


// the same thing that is being used at frontend (web)
function formatPlatform(platform) {
    if (!platform) return 'unknown device';
    if (typeof platform === 'string') return platform;
    if (typeof platform === 'object') {
        const label = `${platform.platform ?? ''}${platform.platform && platform.model ? ' ' : ''}${platform.model ?? ''}`.trim();
        return label || JSON.stringify(platform);
    }
    return String(platform);
}

io.use((socket, next) => {
    try {
        // const rawCookies = socket.handshake.headers.cookie
        // const cookies = cookie.parse(rawCookies || '');
        // console.log('cookie: ', cookies);
        // if (!cookies.token)
        //     return next(new Error("Unauthorized"));

        let token = socket?.handshake?.auth?.token
        verify(token, process.env.JWT_SECRET);
        socket.user = decode(token)
        // console.log('DEV: authorized user:', socket.user)
        next();
    } catch (error) {
        console.error(error.message);
        return next(new Error("Unauthorized"));
    }
})

io.of('/DM').use((socket, next) => {
    try {
        // const rawCookies = socket.handshake.headers.cookie
        // const cookies = cookie.parse(rawCookies || '');
        // console.log('cookie: ', cookies);
        // if (!cookies.token)
        //     return next(new Error("Unauthorized"));

        let token = socket?.handshake?.auth?.token
        // console.log(token)
        verify(token, process.env.JWT_SECRET);
        socket.user = decode(token)
        let usernameLower = socket.user.username.toString().toLowerCase()
        socket.user.username = usernameLower
        // console.log('DEV: authorized user:', socket.user)
        next();
    } catch (error) {
        console.error(error.message);
        return next(new Error("Unauthorized"));
    }
})

io.on('connection', (socket) => {
    // console.log('DEV: connected with: ', socket.id, socket.user);
    socket.broadcast.emit('user-connected', {
        platform: formatPlatform(socket?.handshake?.auth?.platformInfo),
        username: socket.user.username,
        displayName: socket?.handshake?.auth?.displayName,
        profile: socket.user?.profile
    });
    socket.on('send-message', (data) => {
        if (typeof data === 'string') {
            data = JSON.parse(data)
        }
        let responseJSON = {
            isSent: data.isSent || data.IsSent || false, // client (web and iOS) expects false as default value
            displayName: data.displayName,
            message: data.message,
            uid: data.uid
        }
        // iOS may pass nil (null in swift) if users hasent provided username
        // webclient and iOS side validation required to filter specifiv names, to not mess up on server side
        if (responseJSON.displayName == 'nil') {
            responseJSON.displayName = 'iOS / iPadOS'
        }

        // console.log('DEV: ', responseJSON);

        socket.broadcast.emit('recieve-new-message', responseJSON);
    });

    socket.on('am-typing', () => {
        socket.broadcast.emit('is-typing',
            {
                id: socket.id,
                username: socket.user.username
            })
    })

    socket.on('disconnect', (reas) => {
        // console.log(`DEV: disconnected to: ${socket.id} ${reas} `)
        socket.broadcast.emit('user-left',
            {
                id: socket.id,
                platform: formatPlatform(socket?.handshake?.auth?.platformInfo),
                reason: reas
            });
    })
});

io.of('/DM').on('connection', (socket) => {
    // console.log(socket.user)
    // console.log(`DEV: DM: ${socket.user.username} connected`);

    // will be used for notifications, and presence detection
    socket.join(`user:${socket.user.username.toString().toLowerCase()}`)

    // socket.broadcast.emit('userconnected', {
    //     username: socket.user.username
    // });


    let chattingWith = null
    let roomID = null
    socket.on('chatwith', (data) => {
        if (typeof data == 'string') {
            data = JSON.parse(data)
        }
        if (typeof data.username == 'string') {
            const username = data.username.toString().toLowerCase()
            if (chattingWith) {
                socket.leave(chattingWith.roomID)
                chattingWith = null;
            }
            roomID = `dm:${[socket.user.username, username.toString().toLowerCase()].sort().join(':')}`
            // console.log('DEV: roomID: ', roomID)
            socket.join(roomID);
            chattingWith = {
                username: username, // the other user
                roomID
            }
        } else console.log(`DEV: WARN: username is not string ${typeof data.username} ${data.username} ${typeof data} ${data}`)

    })

    socket.on('closedChat', (data) => {
        if (typeof data === 'string') {
            data = JSON.parse(data)
        }
        if (typeof data.username == 'string') {
            let recievedRoomID = `dm:${[socket.user.username, data.username].sort().join(':')}`
            if (recievedRoomID === chattingWith) socket.leave(recievedRoomID)
            else {
                socket.leave(recievedRoomID)
                socket.leave(chattingWith)
            }
        }
    })

    // MARK: NOT DEPENDENT ON CLIENTS ANYMORE
    socket.on('get-all-messages', async () => {
        if (!roomID)
            socket.to(roomID).emit('get-all-messages', [])

        // will add pagination later (get messages as user scrolls up)
        // let messages = await messagesModel
        //     .find({ chatId: roomID })
        //     .sort({ updatedAt: -1 })
        //     .limit(50)
        let messages = await messagesModel.aggregate([
            { $match: { chatId: roomID } },
            { $sort: { createdAt: -1 } },
            { $limit: 50 }, { $sort: { createdAt: 1 } }
        ])

        socket.emit('get-all-messages', messages)
    })


    socket.on('send-message', async (data) => {
        // console.log('DEV: sending message', roomID, data)
        if (!roomID)
            return;
        if (typeof data === 'string') {
            data = JSON.parse(data)
        }
        // planning to send the notification on user specific room, if not connected to DM room 
        const users = io.of('/DM').adapter.rooms.get(roomID)
        // console.log('DEV: ', users);
        const isPresent = users ? users.size : false
        // console.log('DEV: isPresent: ', isPresent)

        if (isPresent === false || isPresent == 1 || isPresent == 0) {
            const time = new Date().toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit'
            });
            socket.to(`user:${chattingWith.username}`).emit('dm-notification', { data: { ...data, username: socket.user.username, timeStamp: time }, roomID })
        } else
            socket.to(roomID).emit('recieve-new-message', { data, roomID });
        await messagesModel.create({
            chatId: roomID,
            senderName: socket.user.username,
            senderId: socket.user._id,
            content: data.message,
        })
    });

    socket.on('am-typing', () => {
        socket.to(roomID).emit('is-typing', { id: socket.id, username: socket.user.username })
    })
});


process.on("uncaughtException", console.error)
process.on("unhandledRejection", console.error)

socketServer.listen(PORT, "0.0.0.0", () => {
    console.log(`DEV: listening on port ${PORT}`);
})
