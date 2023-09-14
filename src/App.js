import React, {useState, useEffect, useCallback, useRef} from "react";
import {Chatbox} from "./components/chatbox";
import {LanguageContext, languages} from './components/languageContext';
import "./App.css";
import tmi from "tmi.js";
import settingsIcon from './settings.svg';
import pubsub from "./components/pubsub";

//const channel = new URL(window.location).searchParams.get('channel'); 
//document.title = `${channel}的聊天室`

const TwitchAuth = "https://id.twitch.tv/oauth2/authorize?response_type=token" +
                   "&client_id=" + "b37i4lohsntm7xwnhafv54cflutqmp" +
                   "&redirect_uri=https://zuphertron.cc/chat" + 
                   "&scope=" + encodeURIComponent("chat:edit chat:read channel:read:redemptions channel:read:subscriptions")

let client
const botsList = new Set(['streamelements', 'nightbot'])

function App() {
  const [messages, setMessages] = useState([]);
  const [checked, setChecked] = useState(new Set());
  const [isFiltering, setFilter] = useState(false);
  const [connected, setConnected] = useState(false);
  const [channelID, setChannelID] = useState('');
  const [channelUserID, setChannelUserID] = useState('');
  const [badgeList, setBadge] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useState(languages.zh);
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('disconnected');
  const [key, setKey] = useState('');
  const [userName, setUserName] = useState('');
  const [autoScroll, setAutoScroll] = useState(false);
  const channelInput = React.useRef(null);
  const message = React.useRef(null);
  const chatDiv = React.useRef(null)

  const logout = () => {
    localStorage.removeItem('userToken')
    setKey('')
    setUserName('')
  }

  //Strip hash and extract access token from URI if present
  useEffect(() => {
    if (document.location.hash === '') return
    let params = (document.location.hash.substring(1)).split('&')
    document.location.hash = ''
    params.forEach(param => {
      let temp = param.split('=')
      if (temp[0] === "access_token") setKey(temp[1])
      if (temp[0] === "error") console.log(temp[1])
    })
  }, []);

  //Load Channel from local storage
  useEffect(()=>{
    if(channel===''||channel===null){
      setChannel(localStorage.getItem('lastChannel'));
    }else{
      localStorage.setItem('lastChannel', channel);
    }
    setChecked(new Set(JSON.parse(localStorage.getItem(`checked_${channel}`))));
  }, [channel])
  
  //Load Key from local storage, cleanup storage if stale
  useEffect(()=>{
    if(key===''||key===null){
      let storedKey = localStorage.getItem('userToken')
      if (!storedKey) return

      fetch('https://id.twitch.tv/oauth2/validate' , {headers: {"Authorization": "OAuth " + storedKey}})
      .then(res => {
        if (res.ok) {
          setKey(storedKey)
        } else {
          localStorage.removeItem('userToken')
        }
      })

    }else{
      localStorage.setItem('userToken', key);
    }
  }, [key])

  //Fetch userID from channel
  useEffect(() => {
      if (channel === '' || key === '') return
      const headers = new Headers()
      headers.append("Authorization", "Bearer "+key)
      headers.append("Client-Id", "b37i4lohsntm7xwnhafv54cflutqmp")

      fetch('https://api.twitch.tv/helix/users?login=' + channel, {headers: headers})
      .then(res => res.json())
      .then(data => {
        setChannelUserID(data.data[0].id)
      })
  }, [channel, key])

  //Fetch userID associated with key
  useEffect(() => {
      if (key === '') return
      const headers = new Headers()
      headers.append("Authorization", "Bearer "+key)
      headers.append("Client-Id", "b37i4lohsntm7xwnhafv54cflutqmp")

      fetch('https://api.twitch.tv/helix/users', {headers: headers})
      .then(res => res.json())
      .then(data => {
        setUserName(data.data[0].login)
      })
  }, [key])

  //Add chat EventListeners
  useEffect(() => {
    if (!client) return
    let connectListener = () => {
      setConnected(true);
    }
    let disconnectListener = (reason) => {
      console.log(`Disconnected due to ${reason}`)
      setConnected(false)
      setStatus('disconnected');
    }
    let reconnectListener = () => {
      setStatus('reconnecting');
    }
    client.on('connected', connectListener);
    client.on('disconnected',disconnectListener);
    client.on('reconnect', reconnectListener);
    return (()=>{
      client.removeListener('connected', connectListener);
      client.removeListener('disconnected', disconnectListener);
      client.removeListener('reconnect', reconnectListener);
    }) 
  }, [connected]);

  const userRef = useRef(userName)
  userRef.current = userName
  const keyRef = useRef(key)
  keyRef.current = key

  //connect Chat Client
  useEffect(() => {
    setTimeout(() => {
      let user = userRef.current
      let login = user? {username: user, password: "oauth:" + keyRef.current} : {}

      client = new tmi.Client({
        connection: {
          reconnect: true,
          secure: true,
        },
        identity: login,
        channels: [],
      });

        client.connect().then(res => setConnected(true)).catch(err => {console.log(err)})
    }, 2000);
  }, [])

  //connect to channel
  useEffect(()=>{
    if (!client) return
    setStatus('disconnected')

    if(connected && channel){
      client.join(channel)
      .then(()=>{
        setStatus('ok');
        document.title = `${channel}的聊天室`
      })
      .catch(()=>{
        setStatus('disconnected');
        setChannel('');
      })
    }
    return(()=>{
      client.part(channel)
      .then(()=>console.log('disconnected from ', channel))
      .catch(console.log);
    })
  }, [connected, channel])

  //connect websocket
  useEffect(()=> {
    if (!key || !channelUserID || (channel.toLowerCase() !== userName.toLowerCase())) return
    pubsub(key, channelUserID, handlePubsubMessage)
  }, [channelUserID, key, userName, channel])

  //Fetch badges
  useEffect(()=>{
    if(key === '' || channelUserID === '') return 

    (async () =>{
      const headers = new Headers()
      headers.append("Authorization", "Bearer "+key)
      headers.append("Client-Id", "b37i4lohsntm7xwnhafv54cflutqmp")

      let allBadges = await Promise.all([
      fetch('https://api.twitch.tv/helix/chat/badges/global', {headers: headers}).then(res => res.json()).then(res => {return res.data}),
      fetch(`https://api.twitch.tv/helix/chat/badges?broadcaster_id=${channelUserID}`, {headers: headers}).then(res => res.json()).then(res => {return res.data})
      ])
      let badgeCollection = {}
      allBadges[0].forEach(set => {
        let versions = {}
        set.versions.forEach(version => {
          versions[version.id] = version.image_url_1x
        })

        badgeCollection[set.set_id] = versions
      })
      allBadges[1].forEach(set => {
        let versions = {}
        set.versions.forEach(version => {
          versions[version.id] = version.image_url_1x
        })

        badgeCollection[set.set_id] = {...badgeCollection[set.set_id], ...versions}
      })
      setBadge(badgeCollection)
    })()

  }, [channelUserID, key])

  const handleChecked = useCallback((id) =>{
    if (!checked.has(id)) {
      let newSet = new Set([id, ...checked]);
      setChecked(newSet)
      localStorage.setItem(`checked_${channel}`, JSON.stringify([...newSet]))
    }
  }, [checked, setChecked, channel])
  
  const toggleSettingsModal = () => {
    setShowSettings(prevState => {
      return !prevState;
    });

  }

  const scrollToBottom = () => {
    const node = chatDiv.current
    node.scrollTop = node.scrollHeight - node.offsetHeight
  }

  const handleMessage = useCallback((_channel, tags, message, self) =>{
    const room = tags['room-id'];
    if(room !== channelID) {setChannelID(room)}
    let msgObj = {
      type: "chat",
      id: self? Date.now():tags.id,
      displayName: tags['display-name'],
      username: tags.username,
      timestamp: self? Date.now():tags["tmi-sent-ts"],
      color: tags.color,
      badges: tags.badges,
      message: message,
      emotes: tags.emotes
    }
    setMessages(prevMsgs => [msgObj, ...prevMsgs.slice(0,150)]);
  },[channelID])

  const handlePubsubMessage = (msgObj) => {
    setMessages(prevMsgs => [msgObj, ...prevMsgs.slice(0,150)])
  }

  useEffect(()=>{
    if(autoScroll) scrollToBottom()
  })
  
  useEffect(()=>{
    if (!client) return
    client.on("message", handleMessage);
    return (()=>{
      client.removeListener("message", handleMessage);
    })
  }, [connected, handleMessage])
  

  return (
    <div className="App">
      <LanguageContext.Provider value={language}>
      {!channel && <div className='modal'><div className='modal__panel'>
        <form onSubmit={e=>{e.preventDefault();setChannel(channelInput.current.value)}}>
          <label>Channel</label>
          <input type='text' ref={channelInput}></input>
        </form>
        </div></div>}
      {showSettings && <div className='modal'><div className='modal__panel'>
          <h2>Settings</h2>
          <div className='modal__main'>
            <label>{language.language}</label>
            <select value={language.code} onChange={e=>setLanguage(languages[e.target.value])}>
              {Object.keys(languages).map(key => {
                return <option key={key} value={key}>{key}</option>
              })}
            </select>
            <form onSubmit={e=>{e.preventDefault();setChannel(channelInput.current.value)}}>
              <label>Channel</label><br></br>
              <input type='text' ref={channelInput}></input>
            </form>
            <button className="twitchLogin" onClick={logout}>Logout</button>
          </div>
          <button onClick={()=>{toggleSettingsModal()}}>{language.close}</button>
        </div></div>}
      <div className="chat" ref={chatDiv} onMouseEnter={()=>setAutoScroll(false)} onMouseLeave={()=>setAutoScroll(true)}>
        {messages.map((message) => {
          if((isFiltering && checked.has(message.username))||botsList.has(message.username)) return null;
          return (
            <Chatbox
              key={message.id}
              isNew={!checked.has(message.username)}
              markChecked={handleChecked}
              badgeList={badgeList}
              {...message}
            ></Chatbox>
          );
        })}
        {!connected && <div>{language.connecting}</div>}
      </div>
      <div className="control">
        <div className='status'><span className={`status__indicator--${status}`}>█</span>{language.status[status]}</div>
        <div><input type='checkbox' onClick={()=>setFilter(!isFiltering)} value={isFiltering} />{language.onlyNew} </div>
        {(!userName) && <a className="twitchLogin" href={TwitchAuth}>login to Twitch</a>}
        {(userName) && <form onSubmit={e=>{e.preventDefault();client.say(channel, message.current.value);message.current.value = ''}}>
          <input type="textbox" ref={message}></input>
        </form>}
        <button className='control__button' onClick={()=>{setChecked(new Set());localStorage.removeItem(`checked_${channel}`);}}>{language.resetRead}</button>
        <button className='control__button' onClick={()=>{toggleSettingsModal()}}>
          <img src={settingsIcon} className='control__icon' alt='settings'/>{language.settings}
        </button>
      </div>
      </LanguageContext.Provider>
    </div>
  );
}

export default App;
