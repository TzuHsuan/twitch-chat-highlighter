# Twitch Chat Highlighter

This tool is to assist Twitch.tv streamers with viewer engagement.

It helps identify viewers that the streamer has not interacted with by applying additional styling to their chat messages. 

Live demo at zuphertron.cc/chat/{channelName}

## Milestones


- [x] Core function (Highlight message, click to mark as read)
- [x] Persist data between refreshs
- [x] UI language options
- [ ] Routing handler
 - Prompt when no/invalid channel
 - Avoid total re-render when changing channels
- [ ] Better state indicators (Disconnected, reconnecting etc)
- [ ] User login and send message
- [ ] Better coverage of chat events (subscription, hosts etc)

## Maybe out of scope but possible extensions

- Keyword filters
- Multi Channel