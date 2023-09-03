export default function pubsub(token, channelID ,messageHandler) {
    const heartbeatInterval = 4 * 60 * 1000 //ms
    var ws;
    var heartbeatTimer
    var pongTimer

    function heartbeat() {
        let message = {
            type: 'PING'
        }
        ws.send(JSON.stringify(message))
        pongTimer = setTimeout(()=> {
            if (!ws) return
            console.log('PING TIMEOUT, closing connection')
            ws.close()
        }, 10000)
        heartbeatTimer = setTimeout(heartbeat, heartbeatInterval + Math.random() * 500)
    }

    function connect(){
        const reconnectInterval = 3 * 1000 //ms
        ws = new WebSocket('wss://pubsub-edge.twitch.tv')

        ws.onopen = () => {
            console.log('INFO: socket opened')
            listen()
            setTimeout(heartbeat, heartbeatInterval + Math.random() * 500)
        }

        ws.onclose = () => {
            console.log('INFO: Socket Closed')
            clearTimeout(heartbeatTimer)
            console.log('INFO: Reconnecting...')
            setTimeout(connect, reconnectInterval)
        };


        ws.onerror = (error) => {
            console.log('ERR: ' + JSON.stringify(error))
        }

        ws.onmessage = (event) => {
            let message = JSON.parse(event.data)
            switch (message.type) {
                case 'PONG': 
                    clearTimeout(pongTimer)
                    break;
                case 'RECONNECT':
                    console.log('INFO: Socket Reconnecting')
                    setTimeout(connect, reconnectInterval)
                    break;
                case 'RESPONSE':
                    message.error? console.log('ERR: Listen failed ' + message.error):console.log('INFO: Listen success')
                    break;
                case 'MESSAGE':
                    parsePayload(message.data)
            }
        }
    }

    const parsePayload = (payload) => {
        let topic = payload.topic
        let message = JSON.parse(payload.message)
        
        if (topic.startsWith('channel-points-channel')) return handlePoints(message)
        if (topic.startsWith('channel-subscribe-events')) return handleSubs(message)
        console.log('WARN: unknow topic ' + topic)
    }
    
    const handlePoints = (message) => {
        let msgObj = {
            type: "points",
            id: "points-" + message.data.redemption.id,
            displayName: message.data.redemption.user.display_name,
            username: message.data.redemption.user.login,
            timestamp: message.data.timestamp,
            message:  message.data.redemption.user_input,
            item: message.data.redemption.reward.title
        }
        messageHandler(msgObj)
    }

    const handleSubs = (message) => {
        let msgObj = {
            type: "sub",
            id: "sub-" + message.recipientUser || message.user_name,
            displayName: message.display_name,
            username: message.user_name,
            timestamp: message.time,
            message: message.sub_message.message,
            emotes: message.sub_message.emotes,
            tier: message.sub_plan[0],
            months: message.cumulative_months || message.months,
            recipientUser: message.recipient_user_name,
            recipientDisplay: message.recipient_display_name
        }
        messageHandler(msgObj)
    }

    function listen() {
        let message = {
            type: "LISTEN",
            data: {
                topics: ["channel-points-channel-v1."+channelID, "channel-subscribe-events-v1."+channelID],
                auth_token: token
            }
        }
        setTimeout(()=>ws.send(JSON.stringify(message)), 5000)
    }

    connect()
}