const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const {generateMessage, generateLocationMessage}= require('./utils/messages')
const {addUser, removeUser, getUser, getUsersInRoom} = require('./utils/users')



const app = express()
const server = http.createServer(app)
const io = socketio(server)// socketio expects to be called with a raw http server

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname,'../public')

app.use(express.static(publicDirectoryPath))

let message = 'Welcome'

io.on('connection', (socket) => {
    console.log('New Websocket Connection')

    socket.on('join', ({username,room}, callback) => {
       
        const { error, user } = addUser({id:socket.id, username:username, room:room})
        
        if (error) {
            return callback(error)
        }
        

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin' ,'Welcome'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has Joined!!`))
        io.to(user.room).emit('roomData', {
            room:user.room,
            users: getUsersInRoom(user.room)
        })
        //io.to.emit- emits an event to everybody in a specific room
        //socket.broadcast.to.emit - sending an event to everyone except a specific client but only in the chatroom
        
        callback()
    }) 
 


    socket.on('sendMessage', (message, callback) =>{
        const user = getUser(socket.id)
        const filter = new Filter ()

        if (filter.isProfane(message)) {
            message = 'Profanity is not allowed :('
            //return callback('Profanity is not allowed :(')
        }

        

        io.to(user.room).emit('message', generateMessage(user.username,message))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        
        if(user){
            
            io.to(user.room).emit('message', generateMessage(user.username, `${user.username} has left` ))
            io.to(user.room).emit('roomData', {
                room:user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit ('locationMessage', generateLocationMessage( user.username,`https://google.com/maps?q=${coords.latitude},${coords.longtitude}`) )
        callback()
    })
})

server.listen(port,() => {
    console.log(`Server is up on port ${port}`)
})

 