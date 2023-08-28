import React from "react";

const Badges = ({ userBadges, badgeList }) => {
  if (Object.keys(badgeList).length === 0 || !userBadges) return null;

  return(<span>
  {Object.keys(userBadges).map(key => {
    let version = userBadges[key]
    let currentBadge = badgeList[key][version];
    if (!currentBadge) {
      return ''
    }
    return <img key={key} className='badge' alt={key} src={currentBadge} /> 
  })}</span>)
}

const Message = ({msgStr, emotes}) => {
  if(!emotes) return msgStr
  var words = msgStr.split(' ');
  let index = new Map();
  let pos = 0;

  Object.keys(emotes).forEach(emote => {
    emotes[emote].forEach(position => {
      let startPos = parseInt(position.split('-')[0]);
      index.set(startPos, emote);
    })
  })

  return(<div>{words.map(word => {
    let curPos = pos
    pos += word.length + 1
   if(!index.has(curPos)) return word + " "
   return <img key={curPos} alt={`emote for ${word}`} className="emoticon" src={`https://static-cdn.jtvnw.net/emoticons/v2/${index.get(curPos)}/default/dark/1.0`} /> 
  })}</div>)
}

export const Chatbox = React.memo((props) => {
    const timestamp = new Date(parseInt(props.timestamp));
    console.log(props.badges)
    
    return(
    <div className={`msgContainer${props.isNew?' new':''}`} onClick={()=>props.markChecked(props.username)}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{color:props.color}}>
          {(props.displayName.toLowerCase() === props.username) ? props.displayName : `${props.displayName}(${props.username})`} <Badges userBadges={props.badges} badgeList={props.badgeList} />
        </div>
          <div>{timestamp.getHours()}:{("00" + timestamp.getMinutes()).slice(-2)}</div>
      </div>
      
    <Message msgStr={props.message} emotes={props.emotes} />
    </div>
  )})
