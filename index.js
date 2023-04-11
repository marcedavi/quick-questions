const express = require('express')
const fileUpload = require('express-fileupload')
const path = require('path');
const WebSocket = require('ws')

const wss = new WebSocket.Server({ port: 8443 })

const app = express()
app.use(fileUpload())
app.use(express.static('public'));

const hostname = '127.0.0.1'
const port = 3000

const players = new Map()
let mancheStartTime = Date.now()

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '/public/admin.html'));
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

app.post('/upload', (req, res) => {
    const { image } = req.files;


    if(!image) {
        image.mv(__dirname + '/public/upload/' + image.name);
        manche('upload/' + image.name)
    } else {
        manche('')
    }

    res.redirect('/admin')
});

wss.on('connection', (ws) => {

    ws.on('message', (json) => {
        const msg = JSON.parse(json);

        switch (msg.action) {
            case 'login':
                login(ws, msg.username, msg.password)
                break
            case 'buzz':
                buzz(msg.username)
                break
            case 'endManche':
                endManche()
                break
        }

        console.log('\n\nPlayers:')
        players.forEach((player) => {
            console.log(player.username, player.password, player.time)
        })
    });

})

function login(ws, username, password) {
    let player = {
        ws: ws,
        username: username,
        password: password
    }

    if (!players.has(username)) {
        players.set(username, player)
        ws.send(JSON.stringify({
            action: 'login'
        }))
        return
    }

    if (players.get(username).password !== password) {
        ws.send(JSON.stringify({
            action: 'login-error'
        }))
        return
    }

    player.time = players.get(username).time;
    players.set(username, player);
    ws.send(JSON.stringify({
        action: 'login'
    }))
}

function buzz(username) {
    if (!players.has(username))
        return;

    let player = players.get(username)
    player.time = (Date.now() - mancheStartTime) / 1000
    player.ws.send(JSON.stringify({
        action: 'buzz'
    }))
}

function manche(image) {
    mancheStartTime = Date.now()
    players.forEach((player) => {
        player.time = 0;

        player.ws.send(JSON.stringify({
            action: 'manche',
            image: image
        }))
    })
}

function endManche() {
    players.forEach((player) => {
        player.ws.send(JSON.stringify({
            action: 'leaderboard',
            players: Array.from(players, (entry) => {
                return {
                    username: entry[1].username,
                    time: entry[1].time
                }
            })
        }))
    })
}