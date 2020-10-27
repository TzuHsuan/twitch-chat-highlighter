import {createContext} from 'react';

export const languages = {
    zh: {code: 'zh',
    language: '語言',
    settings: '設定',
    close: '關閉',
    connecting: '連接中',
    reconnecting: '重新連接中',
    resetRead: '重置已讀',
    onlyNew: '僅顯示新訊息'
    },
    en: {code:'en',
    language: 'Language',
    settings: 'Settings',
    close: 'Close',
    connecting: 'Connecting',
    reconnecting: 'Reconnecting',
    resetRead: 'Reset Read',
    onlyNew: 'New messages only',
    }
}

export const LanguageContext = createContext(languages.zh)