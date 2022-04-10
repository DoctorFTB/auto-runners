import axios from 'axios';

const timeFormat = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  day: '2-digit',
  month: '2-digit'
});

async function sendTelegramLog(level: string, text: string) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const token = process.env.TELEGRAM_TOKEN;

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

// It's trash, I know... Maybe later I'll do better :) Also, PRs are welcome
export class Logger {
  public static log(text: string) {
    const log = `[${timeFormat.format()}] ${text}`;
    console.log(log);
    sendTelegramLog('✅', log);
  }

  public static warn(text: string) {
    const log = `[${timeFormat.format()}] ${text}`;
    console.warn(log);
    sendTelegramLog('❓', log);
  }

  public static error(text: string, additional: string) {
    const log = `[${timeFormat.format()}] ${text} \n ${additional}`;
    console.error(log);
    sendTelegramLog('🆘', log);
  }
}
