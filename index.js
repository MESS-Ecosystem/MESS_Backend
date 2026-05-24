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
const { verify } = require('jsonwebtoken');
const PORT = process.env.PORT || 8080;
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

server.use(express.urlencoded());
server.use(express.json());
server.use('/', require('./Routes/index.routes'))
server.use('/auth', require('./Routes/auth.routes'))
server.use('/chat', require('./Routes/chat.routes'))
server.use('/account', require('./Routes/account.routes'))


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
        socket.user = verify(token, process.env.JWT_SECRET);
        console.log('DEV: authorized user:', socket.user)
        next();
    } catch (error) {
        console.log(error.message);
        return next(new Error("Unauthorized"));
    }
})

io.on('connection', (socket) => {
    console.log('DEV: connected with: ', socket.id, socket.user);
    socket.broadcast.emit('user-connected', {
        id: socket.id,
        platform: formatPlatform(socket?.handshake?.auth?.platformInfo),
        username: socket.user.username,
        displayName: socket?.handshake?.auth?.displayName,
    });
    socket.on('send-message', (data) => {
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

        console.log('DEV: ', responseJSON);

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
        console.log(`DEV: disconnected to: ${socket.id} ${reas} `)
        socket.broadcast.emit('user-left',
            {
                id: socket.id,
                platform: formatPlatform(socket?.handshake?.auth?.platformInfo),
                reason: reas
            });
    })
});

io.of('/DM').on('connection', (socket) => {
    console.log(`DEV: DM: ${socket.user.username} connected`);

    // will be used for notifications, and presence detection
    socket.connect(`user:${socket.user.username}`)

    socket.broadcast.emit('userconnected', {
        username: socket.user.username
    });


    let chattingWith = null
    let roomID = null
    socket.on('chatwith', ({ username }) => {
        if (typeof username == 'string') {
            if (chattingWith) {
                socket.leave(chattingWith.roomID)
                chattingWith = null;
            }
            roomID = `dm:${[socket.user.username, username].sort().join(':')}`
            console.log('DEV: ', roomID)
            socket.join('DEV: ',roomID);
            chattingWith = {
                username, // the other user
                roomID
            }
        }

    })


    // MARK: NOT DEPENDENT ON CLIENTS ANYMORE
    // let currentRoom = null; // track active room
    // socket.on('connectToRoom', ({ room }) => {
    //     if (typeof room === 'string') {

    //         // leave previous room/chat if exists
    //         if (currentRoom)
    //             socket.leave(currentRoom);
    //         socket.join(room);
    //         currentRoom = room;

    //         socket.emit('currentroom', { room });
    //     }
    // });
    socket.on('get-all-messages', async () => {
        if (!roomID)
            socket.to(roomID).emit('get-all-messages', [])

        // will add pagination later (get messages as user scrolls up)
        let messages = await messagesModel
            .find({ chatId: roomID })
            .sort({ createdAt: 1 })
            .limit(50)
        socket.emit('get-all-messages', messages)
    })


    socket.on('send-message', async (data) => {
        if (!roomID)
            return;


        // planning to send the notification on user specific room, if not connected to DM room 
        const users = io.of('/DM').adapter.rooms.get(roomID)
        console.log('DEV: ', users); 
        const isPresent = users ? users.size : false
        console.log('DEV: isPresent: ', isPresent)


        socket.to(roomID).emit('recieve-new-message', data);
        await messagesModel.create({
            chatId: roomID,
            senderId: socket.user.username,
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
    console.log(`DEV: console.loglistening on port ${PORT}`);
})
