const mongoose = require('mongoose');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bodyParser = require('body-parser');
const cors = require('cors');
const {GoogleGenerativeAI} = require('@google/generative-ai');
const googleTTS = require('google-tts-api');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: process.env.GEMINI_MODEL,
  //safetySettings: [
  //    {
   //     category: //HarmCategory.HARM_CATEGORY_HARASSMENT,
  //      threshold: //HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
 //     },
  //]
});
const uri = process.env.MONGODB_URI;
const vi_char = /[^a-zA-Z0-9\s,.-_@!?aAàÀảẢãÃáÁạẠăĂằẰẵẴắẮẳẲạẠâÂặẶầẦẩẨẫẪấẤậẬbBcCdDđĐeEèÈẻẺẽẼéÉẹẸêÊềỀểỂễỄếẾệỆfFgGhHiIìÌỉỈĩĨíÍịỊjJkKlLmMnNoOòÒỏỎõÕÓóọỌôÔồỒổỔỗỖốỐộỘơƠờỜởỞỡỠớỚợỢpPqQrRsStTuUùÙủỦũŨúÚụỤưƯừỪửỬữỮứỨựỰvVwWxXyYỳỲỷỶýÝỹỸỵỴzZ]/g;
app.use(express.static('public'));

app.use(bodyParser.json({ limit: '2.5mb' }));

app.use(cors({
  origin: [
	'https://node.keg4re.site',
	"localhost",
	"http://localhost:5173"
  ],
  credentials: true
}));

app.use( session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({
        mongoUrl : uri,
        //client : mongoClient.getClient(),
        ttl: 3 * 24 * 60 * 60,
        //autoRemove: 'native',
        autoRemove: 'interval',
        autoRemoveInterval: 60,
        //mongoOptions: {
          //connectTimeoutMS: 10000,
          //socketTimeoutMS: 45000,
        //},
    })
}));

mongoose.connect(uri);

const ChatSchema = mongoose.Schema({
  userId: String,
  timestamp: Date,
  message: String,
  imageBase64: String,
  hasImage: Boolean,
  response: String
},{ timestamps: true } );

ChatSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3 * 24 * 60 * 60 });

const Chat = mongoose.model('Chat', ChatSchema);

app.get('/tt', (req, res) => {
  if (!req.session.visited){
    req.session.visited = true;
  }
  res.json({ ss : req.session});
});

async function getHistoryImage(recordId){
  const record = await Chat.findById(recordId).select('imageBase64');
  return record?.imageBase64;
}

async function getHistory(userId){
  let history = [];
  const historydb = await Chat.find({ userId }).select('-imageBase64').sort({ timestamp: 1 });

  for (const chat of historydb) {
    history.push(
      {
        image_id: chat.hasImage ? chat._id : '',
        role: "user",
        parts: [{ text: chat.message }],
     }
    );

    history.push(
      {
        role: "model",
        parts: [{ text: chat.response }],
     }
    );

  }

  return history;
}

async function addHistory(userId, message, response, hasImage = false, imageBase64 = ""){
  const newChat = new Chat({ userId, timestamp: new Date(), message, response, hasImage, imageBase64: `${imageBase64?.type},${imageBase64?.source}` });
  await newChat.save().then(() => console.log('meow saved mess'));
  return;
}

app.get('/getImage', async (req, res) => {

  const img = await getHistoryImage(req.query.id);

  res.json({
    img : img 
  });
})

app.post('/history', async (req, res) => {
  if (!req.session.visited) {
    req.session.visited = true;
  }
  const history = await getHistory(req.sessionID);

  res.json({
    history: history
  });
})

app.post('/voice', async (req, res) => {
  await getVoice(req, res);
})

app.post("/chat", async (req, res) => {
  const msg = req.body.msg;
  let result;
  let text = "";
  let hasImage = false;
  let imageBase64 = req.body.img;
  let data;
  let inline = {};
  if(imageBase64?.type){
    inline = {
      inlineData: {
        data: imageBase64.source,
        mimeType: "image/png",
      },
    };
    data = [msg, inline];
    hasImage = true;
  }else{
    data = msg;
  }
  try{
    if(req.body.history == []){
        result = await model.generateContent(data);
        text = result.response.text();
        await addHistory(req.sessionID, msg, text, hasImage, imageBase64);
    }else{
      const chat = model.startChat({
          history: req.body.history,
          generationConfig: {
              maxOutputTokens: 10000,
          },
      });

      result = await chat.sendMessage(data);
      const response = await result.response;
      text = response.text();
      await addHistory(req.sessionID, msg, text, hasImage, imageBase64);
    }
    await getVoice(req,res,text);
  }catch(error){
    res.json({
      text:null,
      response :result?.response?.promptFeedback,
      //error: error.toString()
    });
  };
});

function splitStringByLength(str, maxLength) {
    let result = [];
    let startIndex = 0;

    while (startIndex < str.length) {
        let endIndex = Math.min(startIndex + maxLength, str.length);
        if (endIndex < str.length && str[endIndex] !== ' ') {
            while (endIndex > startIndex && str[endIndex] !== ' ') {
                endIndex--;
            }
        }

        if (endIndex === startIndex) {
            endIndex = Math.min(startIndex + maxLength, str.length);
        }

        result.push({
		text : str.substring(startIndex, endIndex).trim(),
		base64 : ''

	});
        startIndex = endIndex + 1;
    }
    return result;
}

async function getAllVoice(text){
  const voice = await googleTTS
    .getAllAudioBase64( text.replace(vi_char, ' ') , {
      lang: 'vi',
      slow: false,
      host: 'https://translate.google.com',
      timeout: 10000,
      splitPunct: ',.?',
  })
  .then(allBase64 =>{
    res.json({
        text : {
            role: "model",
            parts: [{ text: text }],
        },
        voice : allBase64
     });
  });
};

async function getVoice(req, res, fullText=''){
  let text;
  let listVoice;
  if (fullText == ''){
    text = req.body.text;
    await googleTTS
      .getAudioBase64( text.replace(vi_char, ' ') , {
        lang: 'vi',
        slow: false,
        host: 'https://translate.google.com',
        timeout: 15000,
        splitPunct: ',.?',
    })
    .then(base64 =>{
       res.json({
         voice : base64
       });
    });
  }else{
    listVoice = splitStringByLength(fullText, 200);
    text = listVoice[0]?.text;
    await googleTTS
      .getAudioBase64( text.replace(vi_char, ',') , {
        lang: 'vi',
        slow: false,
        host: 'https://translate.google.com',
        timeout: 15000,
        splitPunct: ',.?',
    })
     .then(base64 =>{
       listVoice[0].base64 = base64;
       res.json({
         text : {
            role: "model",
            parts: [{ text: fullText }],
         },
         voice : listVoice
       });
     });
  }
};

app.listen(port, () => {
  console.log(`listening on port ${port}`);
});
