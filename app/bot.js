const isBotMessage = (msg) => msg.startsWith('@chaos:');

const replyOnBotMessage = (msg) => {
  const command = msg.substr(7).trim();
  switch (command) {
    case 'погода':
      return `температура: ${Math.floor(Math.random() * 30)} градусов`;
    case 'время': {
      const now = new Date();
      return `сейчас ${String(now.getHours()).padStart(2, '0')} часов ${String(now.getMinutes()).padStart(2, '0')} минут`;
    }
    case 'курс доллара':
      return `rub/usd: ${(Math.random() * 40 + 30).toFixed(2)}`;
    case 'гороскоп':
      return `весам сегодня ${Math.random() > 0.5 ? 'везёт' : 'не везёт'}`;
    case 'результат матча':
      return `${Math.floor(Math.random() * 10)} : ${Math.floor(Math.random() * 10)}`;
    default:
      return 'неизвестная комманда!';
  }
};

module.exports = {
  isBotMessage,
  replyOnBotMessage,
};
