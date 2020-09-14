const axios = require('axios')
const WebSocket = require('ws')
const cors = require('cors')
const bodyParser = require('body-parser')

let payoutMap = new Map()
let openedMap = new Map()
let digitalPayoutMap = new Map()

var express = require('express')
var app = express()
app.use(cors({ origin: '*' }))
app.use(bodyParser.json())

let logging

setInterval(() => {
    axios.get('https://checkpayout.herokuapp.com/')
}, 300000)

app.get('/log', (req, res) => {
    logging = req.body
    log(req.body)
    res.status(200).send()
})

app.get('/payout/:type', (req, res) => {
    const type = req.params.type

    if (payoutMap.has(type)) {
        let payoutsArray = []
        for (var [key, value] of payoutMap.get(type)) {
            payoutsArray.push(key)
            payoutsArray.push(value)
        }
        log(payoutsArray)
        res.status(200).send(payoutsArray)
    } else
        res.status(404)

})

app.get('/opened/:type', (req, res) => {
    const type = req.params.type
    if (openedMap.has(type)) {
        res.status(200).send(Array.from(payoutMap.get(type)))
    } else
        res.status(404)
})

const log = m => {
    console.log(m)
}

app.get('/', function (req, res) {
    res.send('Opa')
})

const PORT = process.env.PORT || 3000
app.listen(PORT)

const url = 'wss://iqoption.com/echo/websocket'

let ssid

const activesMap = [108, 7, 943, 101, 7, 943, 101, 944, 99, 107, 2, 4, 1, 104, 102, 103, 3, 947, 5, 8, 100, 72, 6, 168, 105, 212, 76, 77, 78, 79, 80, 81, 84, 85, 86]

const onOpen = () => {
    console.log(`Connected with websocket..`)
}

const onError = error => {
    console.log(`WebSocket error: ${error}`)
}

let currentTime

const onMessage = e => {
    const message = JSON.parse(e.data)
    if (message.name == 'heartbeat') {
        currentTime = message.msg
    }

    if (message.name == 'profile') {
        subscribeActives()
    }

    if (message.name == 'api_option_init_all_result') {
        // console.log('RES = ' + e.data)
        payoutStuff(message)
    }

    if (message.name == 'instrument-quotes-generated') {
        payoutDigitalStuff(message)
    }

}

function payoutDigitalStuff(message) {
    const quotes = message.msg.quotes
    const active = message.msg.active
    for (let index = 0; index < quotes.length; index++) {
        const symbols = quotes[index].symbols
        if (!!symbols)
            for (let index1 = 0; index1 < symbols.length; index1++) {
                if (symbols[index1].includes('SPT')) {
                    let ask = quotes[index].price.ask
                    let payout = ((100 - ask) * 100) / ask
                    digitalPayoutMap.set(active, parseInt(payout.toFixed(2)))
                    break
                }
            }
    }
    payoutMap.set('digital', digitalPayoutMap)
}

function payoutStuff(message) {
    let result = message.msg.result
    let payoutHere = new Map()
    let openedHere = new Map()
    if (result && result.binary)
        Object.entries(result.binary.actives).forEach(([key1, value]) => {
            if (value.name) {
                const activeString = value.name.substring(6, value.name.length)
                if (activesMapString.has(activeString)) {
                    const active = activesMapString.get(activeString)
                    payoutHere.set(active, 100 - value.option.profit.commission)
                    if (value.enabled != undefined)
                        openedHere.set(active, value.enabled)
                }
            }
        })
    openedMap.set('binary', openedHere)
    payoutMap.set('binary', payoutHere)
    payoutHere = new Map()
    openedHere = new Map()
    if (result && result.turbo)
        Object.entries(result.turbo.actives).forEach(([key1, value]) => {
            const activeString = value.name.substring(6, value.name.length)
            if (activesMapString.has(activeString)) {
                const active = activesMapString.get(activeString)
                payoutHere.set(active, 100 - value.option.profit.commission)
                if (value.enabled != undefined)
                    openedHere.set(active, value.enabled)
            }
        })
    payoutMap.set('turbo', payoutHere)
    openedMap.set('turbo', openedHere)
    log(openedMap)
}

let ws = new WebSocket(url)
ws.onopen = onOpen
ws.onerror = onError
ws.onmessage = onMessage

const loginAsync = async () => {
    await doLogin(ws)
}

const doLogin = () => {
    return new Promise((resolve, reject) => {
        if (ws.readyState === WebSocket.OPEN) {
            console.log(JSON.stringify({ 'name': 'ssid', 'msg': ssid, "request_id": "" }))
            ws.send(JSON.stringify({ 'name': 'ssid', 'msg': ssid, "request_id": '' }))
            tryingToLogin = false
            resolve()
        }
    })
}

const activesMapString = new Map([
    ['AUDCAD', 7],
    ['EURAUD', 108],
    ['EURCAD', 105],
    ['EURNZD', 212],
    ['AUDCHF', 943],
    ['CADJPY', 945],
    ['AUDJPY', 101],
    ['AUDNZD', 944],
    ['AUDUSD', 99],
    ['CADCHF', 107],
    ['EURGBP', 2],
    ['EURJPY', 4],
    ['EURUSD', 1],
    ['GBPAUD', 104],
    ['GBPCAD', 102],
    ['GBPCHF', 103],
    ['GBPJPY', 3],
    ['GBPNZD', 947],
    ['GBPUSD', 5],
    ['NZDUSD', 8],
    ['USDCAD', 100],
    ['USDCHF', 72],
    ['USDJPY', 6],
    ['USDNOK', 168],
    ['EURUSD-OTC', 76],
    ['EURGBP-OTC', 77],
    ['USDCHF-OTC', 78],
    ['EURJPY-OTC', 79],
    ['NZDUSD-OTC', 80],
    ['GBPUSD-OTC', 81],
    ['GBPJPY-OTC', 84],
    ['USDJPY-OTC', 85],
    ['AUDCAD-OTC', 86]
])

axios.post('https://auth.iqoption.com/api/v2/login', {
    identifier: "vinipsidonik@hotmail.com",
    password: "gc896426"
}).then((response) => {
    ssid = response.data.ssid
    loginAsync(ssid)
}).catch(function (err) {
    if (err) {
        console.log('Erro ao se conectar... Tente novamente')
        console.log(err);
    }
})
function subscribeActives() {
    for (let i = 0; i < activesMap.length; i++) {
        ws.send(JSON.stringify({ "name": "subscribeMessage", "msg": { "name": "instrument-quotes-generated", "params": { "routingFilters": { "active": activesMap[i], "expiration_period": 60, "kind": "digital-option" } }, "version": "1.0" }, "request_id": "" }))
        ws.send(JSON.stringify({ "name": "subscribeMessage", "msg": { "name": "instrument-quotes-generated", "params": { "routingFilters": { "active": activesMap[i], "expiration_period": 300, "kind": "digital-option" } }, "version": "1.0" }, "request_id": "" }))
        ws.send(JSON.stringify({ "name": "subscribeMessage", "msg": { "name": "instrument-quotes-generated", "params": { "routingFilters": { "active": activesMap[i], "expiration_period": 900, "kind": "digital-option" } }, "version": "1.0" }, "request_id": "" }))
    }
    ws.send(JSON.stringify({ "name": "api_option_init_all", "msg": "", "request_id": "" }))
}

setInterval(() => {
    if (ws.readyState === WebSocket.OPEN)
        ws.send(JSON.stringify({ "name": "api_option_init_all", "msg": "", "request_id": "" }))
    if (logging && logging.log)
        log(payoutMap)
}, 5000)
