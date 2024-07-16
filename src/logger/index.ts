import axios from 'axios';

import { getConfig } from '../config';

enum ELogLevel {
  DEBUG,
  INFO,
  WARN,
  ERROR,
}

const timeFormat = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  day: '2-digit',
  month: '2-digit',
});

async function sendTelegramLog(level: string, text: string) {
  const { chatId, token } = getConfig().telegram || {};

  if (chatId && token) {
    const data = {
      chat_id: chatId,
      text: level + ': ' + text,
      disable_notification: true,
    };
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, data, {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

const {
  logger: { level: innerLevel, forceConsoleLogs },
} = getConfig();
const logLevel = ELogLevel[innerLevel];

function isValidLevel(level: ELogLevel) {
  return level >= logLevel;
}

// It's trash, I know... Maybe later I'll do better :) Also, PRs are welcome
export class Logger {
  public static info(text: string) {
    const log = `[${timeFormat.format()}] ${text}`;
    const valid = isValidLevel(ELogLevel.INFO);

    if (valid || forceConsoleLogs) {
      console.log(log);
    }

    if (valid) {
      sendTelegramLog('✅', log);
    }
  }

  public static warn(text: string) {
    const log = `[${timeFormat.format()}] ${text}`;
    const valid = isValidLevel(ELogLevel.WARN);

    if (valid || forceConsoleLogs) {
      console.warn(log);
    }

    if (valid) {
      sendTelegramLog('❓', log);
    }
  }

  public static error(text: string, additional: string) {
    const log = `[${timeFormat.format()}] ${text}\n${additional}`;
    const valid = isValidLevel(ELogLevel.ERROR);

    if (valid || forceConsoleLogs) {
      console.error(log);
    }

    if (valid) {
      sendTelegramLog('🆘', log);
    }
  }
}
