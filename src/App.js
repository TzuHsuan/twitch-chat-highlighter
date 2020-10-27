import React, {useState, useEffect, useCallback} from "react";
import {Chatbox} from "./components/chatbox";
import {LanguageContext, languages} from './components/languageContext';
import "./App.css";
import tmi from "tmi.js";
import settingsIcon from './settings.svg';

const channel = window.location.pathname.replace('/chat/', '');
document.title = `${channel}的聊天室`

const client = new tmi.Client({
  connection: {
    reconnect: true,
    secure: true,
  },
  identity: {},
  channels: [channel],
});


const botsList = new Set(['streamelements', 'nightbot'])

function App() {
  const [messages, setMessages] = useState([]);
  const [checked, setChecked] = useState(new Set());
  const [isFiltering, setFilter] = useState(false);
  const [connected, setConnected] = useState(false);
  const [channelID, setChannelID] = useState('');
  const [badgeList, setBadge] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useState(languages.zh);

  useEffect(() => {
    client.connect()
    .then(()=>setConnected(true))
    .catch(console.error);
  }, []);

  useEffect(()=>{
    setChecked(new Set(JSON.parse(localStorage.getItem(`checked_${channel}`))))
  }, [])

  useEffect(()=>{
    if(channelID!==''){
    (async () =>{
      let allBadges = await Promise.all([
      fetch('https://badges.twitch.tv/v1/badges/global/display').then(res => res.json()).then(data => {return data.badge_sets}),
      fetch(`https://badges.twitch.tv/v1/badges/channels/${channelID}/display`).then(res => res.json()).then(data => {return data.badge_sets})
      ])
      allBadges[1].bits = allBadges[1].bits || {versions:{}}
      allBadges[1].subscriber = allBadges[1].subscriber || {versions:{}}
      setBadge({...allBadges[0], bits:{versions:{...allBadges[0].bits.versions, ...allBadges[1].bits.versions}},subscriber:{versions:{...allBadges[0].subscriber.versions, ...allBadges[1].subscriber.versions}}})
    })()}
  }, [channelID])

  const handleChecked = useCallback((id) =>{
    if (!checked.has(id)) {
      let newSet = new Set([id, ...checked]);
      setChecked(newSet)
      localStorage.setItem(`checked_${channel}`, JSON.stringify([...newSet]))
    }
  }, [checked, setChecked])
  
  const toggleSettingsModal = () => {
    setShowSettings(prevState => {
      document.querySelector('.chat').classList.toggle('blur', !prevState);
      return !prevState;
    });

  }


  const handleMessage = useCallback((_channel, tags, message) =>{
    const room = tags['room-id'];
    if(room !== channelID) {setChannelID(room)}
    let msgObj = {
      id: tags.id,
      displayName: tags['display-name'],
      username: tags.username,
      timestamp: tags["tmi-sent-ts"],
      color: tags.color,
      badges: tags.badges,
      message: message,
      emotes: tags.emotes
    }
    setMessages(prevMsgs => [msgObj, ...prevMsgs.slice(0,150)]); 
  },[channelID])

  
  useEffect(()=>{
  if(connected){
    client.on("message", handleMessage);
    return (()=>{
      client.removeListener("message", handleMessage);
    })}
  }, [handleMessage, connected])

  return (
    <div className="App">
      <LanguageContext.Provider value={language}>
      {showSettings && <div className='modal'>
          <label>{language.language}</label>
          <select value={language.code} onChange={e=>setLanguage(languages[e.target.value])}>
            {Object.keys(languages).map(key => {
              return <option key={key} value={key}>{key}</option>
            })}
          </select>
          <button onClick={()=>{toggleSettingsModal()}}>{language.close}</button>
        </div>}
      <div className="chat">
      <div>
      </div>
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
        <div><input type='checkbox' onClick={()=>setFilter(!isFiltering)} value={isFiltering} />{language.onlyNew}
        </div>
        <input type='text' className='control__textbox' disabled/>
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
