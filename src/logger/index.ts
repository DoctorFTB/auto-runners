import axios from 'axios';

import { getConfig } from '../config';

enum ELogLevel {
  DEBUG,
  INFO,
  WARN,
  ERROR,
}

const LOG_LEVEL_TO_EMOJI: Record<ELogLevel, string> = {
  [ELogLevel.DEBUG]: '🤫',
  [ELogLevel.INFO]: '✅',
  [ELogLevel.WARN]: '❓',
  [ELogLevel.ERROR]: '🆘',
};

const timeFormat = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  day: '2-digit',
  month: '2-digit',
});

const {
  logger: { level: innerLevel, forceConsoleLogs },
} = getConfig();

export class Logger {
  private static logLevel = ELogLevel[innerLevel];

  private static isValidLevel(level: ELogLevel) {
    return level >= Logger.logLevel;
  }

  private static async sendTelegramLog(text: string, level: ELogLevel) {
    const { chatId, token } = getConfig().telegram || {};

    if (chatId && token) {
      const data = {
        chat_id: chatId,
        text: LOG_LEVEL_TO_EMOJI[level] + ': ' + text,
        disable_notification: true,
      };

      return await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, data, {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private static handleLog(rawText: string, level: ELogLevel) {
    const text = `[${timeFormat.format()}] ${rawText}`;
    const valid = Logger.isValidLevel(level);

    if (valid || forceConsoleLogs) {
      const method = ELogLevel[level].toLowerCase() as 'debug' | 'info' | 'warn' | 'error';
      console[method](text);
    }

    if (valid) {
      return Logger.sendTelegramLog(text, level);
    }
  }

  public static info(text: string) {
    return this.handleLog(text, ELogLevel.INFO);
  }

  public static warn(text: string) {
    return this.handleLog(text, ELogLevel.WARN);
  }

  public static error(text: string, additional: string) {
    return this.handleLog(`${text}\n${additional}`, ELogLevel.ERROR);
  }
}
