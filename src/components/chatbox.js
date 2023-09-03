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

const SubMessage = (props) => {
  props = props.props
  const timestamp = new Date(parseInt(props.timestamp));

  let emotes = {}
  props.emotes.forEach(emote => {
    let existing = emotes[emote.id] ? emotes[emote.id] : []
    emotes[emote.id] = [...existing, `${emote.start}-${emote.end}`]
  })

  let isGift = props.recipientUser? true : false
  let user = !props.username ? '匿名' :
    props.displayName?.toLowerCase() === props.username ? props.displayName : `${props.displayName}(${props.username})`
  let recipient = props.recipientDisplay?.toLowerCase() === props.recipientUser ? props.recipientDisplay : `${props.recipientDisplay}(${props.recipientUser})`
  let message = isGift ? 
                  `${user} 贈送了層級 ${props.tier} 的訂閱給 ${recipient} 現在訂閱 ${props.months} 個月了！` :
                  `${user} 訂閱了層級 ${props.tier} 。總共訂閱 ${props.months} 個月了！`
  return (
    <div className={`msgContainer${props.isNew?' new':''}`} onClick={()=>props.markChecked(props.username)}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          {message}
        </div>
          <div>{timestamp.getHours()}:{("00" + timestamp.getMinutes()).slice(-2)}</div>
      </div>
      {props.message && <Message msgStr={props.message} emotes={emotes}/>}
    </div>)
}

export const Chatbox = React.memo((props) => {
    const timestamp = new Date(parseInt(props.timestamp));
    
    return(<>
    {(props.type==="chat") && <>
    <div className={`msgContainer${props.isNew?' new':''}`} onClick={()=>props.markChecked(props.username)}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{color:props.color}}>
          {(props.displayName.toLowerCase() === props.username) ? props.displayName : `${props.displayName}(${props.username})`} <Badges userBadges={props.badges} badgeList={props.badgeList} />
        </div>
          <div>{timestamp.getHours()}:{("00" + timestamp.getMinutes()).slice(-2)}</div>
      </div>
      
    <Message msgStr={props.message} emotes={props.emotes} />
    </div>
  </>}

    {(props.type==="points") && <>
    <div className={`msgContainer${props.isNew?' new':''}`} onClick={()=>props.markChecked(props.username)}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          {(props.displayName.toLowerCase() === props.username) ? props.displayName : `${props.displayName}(${props.username})`} <span>兌換了 {props.item}</span>
        </div>
          <div>{timestamp.getHours()}:{("00" + timestamp.getMinutes()).slice(-2)}</div>
      </div>
      {props.message && <Message msgStr={props.message}/>}
    </div>
  </>}

    {(props.type==="sub") && <SubMessage props={props} />}

  </>
  )})
