const http = require('http');
const fs = require('fs');
const path = require('path');
const Koa = require('koa');
const cors = require('@koa/cors');
const koaBody = require('koa-body');
const mime = require('mime-types');

const { isBotMessage, replyOnBotMessage } = require('./bot');

const app = new Koa();

app.use(cors());
app.use(koaBody({ multipart: true, uploadDir: './upload' }));

const RECORDS_PER_PAGE = 5;

const savedMedia = [
  {
    id: 1,
    type: 'text',
    content: 'пес некормлен!',
    pinned: true,
  },
  {
    id: 2,
    type: 'text',
    content: 'надо сходить покушать в новый ресторан',
  },
  {
    id: 3,
    type: 'link',
    content: 'https://google.com/',
  },
  {
    id: 4,
    type: 'image',
    content: '/upload/sample.jpg',
  },
  {
    id: 5,
    type: 'video',
    content: '/upload/sample.mp4',
  },
  {
    id: 6,
    type: 'audio',
    content: '/upload/sample.wav',
  },
  {
    id: 7,
    type: 'geoposition',
    content: '55.11 89.444',
  },
  {
    id: 8,
    type: 'image',
    content: '/upload/sample2.jpg',
  },
];

let currentId = savedMedia.length + 1;

/*
 * Return saved media records ordered by id in descending order limited by RECORDS_PER_PAGE
 *
 * id of records should be bigger than "fromId" parameter
 */
const listSaved = (fromId) => {
  const minId = fromId || 0;

  return savedMedia
    .sort((a, b) => a.id - b.id)
    .filter(({ id }) => id > minId)
    .slice(0, RECORDS_PER_PAGE);
};

/*
 * Save file to upload directory
 */
const saveFile = (file) => {
  const tempPath = file.path;
  const tempFileName = tempPath.split(path.sep).pop();
  const originalName = file.name;
  const originalExtension = originalName.split('.').pop() || 'jpg';
  const newFileName = `${tempFileName}.${originalExtension}`;
  fs.copyFileSync(tempPath, path.resolve(__dirname, '../upload/', newFileName));
  return newFileName;
};

/*
 * Save record about added media
 */
const saveMedia = (type, content) => {
  const media = { type, content, id: currentId };
  savedMedia.push(media);
  currentId += 1;
  return media;
};

/*
 * Handle incoming text to process
 */
const processText = (body) => {
  const { type, content } = body;

  if (type === 'geoposition') {
    return saveMedia(type, content);
  }

  if (type !== 'text') {
    return { type: 'error', message: 'wrong content type' };
  }

  if (isBotMessage(content)) {
    return { type: 'bot_reply', content: replyOnBotMessage(content) };
  }

  if (content.startsWith('http://') || content.startsWith('https://')) {
    return saveMedia('link', content);
  }

  // simple text
  return saveMedia(type, content);
};

/*
 * Handle incoming user media to save
 */
const processMedia = (files) => {
  const type = files.media.type.split('/')[0];
  // image / video / audio
  const fileName = saveFile(files.media);
  return saveMedia(type, `/upload/${fileName}`);
};

/*
 * Mark media as pinned
 */
const setPinnedState = ({ id, pinned }) => {
  savedMedia.find((item) => item.id === id).pinned = pinned;
};

/*
 * Return pinned element
 */
const getPinned = () => savedMedia.find((item) => item.pinned === true);

app.use(async (ctx) => {
  switch (ctx.path) {
    case '/list':
      if (ctx.method !== 'GET') {
        break;
      }
      ctx.response.body = {
        items: listSaved(ctx.query.fromId),
        maxId: currentId - 1,
      };
      return;
    case '/sendText':
      if (ctx.method !== 'POST') {
        break;
      }
      ctx.response.body = processText(ctx.request.body);
      return;
    case '/sendMedia':
      if (ctx.method !== 'POST') {
        break;
      }
      ctx.response.body = processMedia(ctx.request.files);
      return;
    case '/setPinnedState':
      if (ctx.method !== 'POST') {
        break;
      }
      ctx.response.body = setPinnedState(ctx.request.body);
      return;
    case '/getPinned':
      if (ctx.method !== 'GET') {
        break;
      }
      ctx.response.body = getPinned();
      return;
    default:
      if (ctx.path.startsWith('/upload')) {
        const fileName = ctx.path.slice(8);
        const filePath = path.resolve(__dirname, '../upload', fileName);
        const mimeType = mime.lookup(filePath);
        const fileStream = fs.createReadStream(filePath);
        ctx.response.set('content-type', mimeType);
        if (ctx.query.download) {
          ctx.response.set('content-disposition', `attachment; filename=${fileName}`);
        }
        ctx.body = fileStream;
        return;
      }
      break;
  }

  ctx.response.status = 404;
});

http.createServer(app.callback()).listen(process.env.PORT || 7777, () => console.log('Server is working'));
