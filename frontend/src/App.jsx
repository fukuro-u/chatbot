import {useState, useEffect, useRef} from "react";
import LazyImage from "./lazyload";
import CodeHighlighter from './CodeHighlighter';
 let backend_uri = 'https://node.keg4re.site';
// let backend_uri = 'http://localhost:8080';
function App() {
  const [message, setMessage] = useState("");
  const [chats, setChats] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [appLoaded, setAppLoaded] = useState(false);
  const [endViewport, setEndViewport] = useState(false);
  const [errorHistory, setErrorHistory] = useState(false);
  const [gVoicePlayer, setGVoicePlayer] = useState(null);
  let started = false;
  
  useEffect(() => {
    setGVoicePlayer(new gVoice(document.getElementById('gVoice')));
   
    fetch(`${backend_uri}/history`,{ method: 'POST', credentials : "include"})
      .then(results => results.json())
      .then(data => {
        setChats(data.history);
        //setAppLoaded(true);
	      if(!started) {endMessage()};
        // zoomImage();
        checkEndViewport();
        scrollEvent();
      }).catch((error) => {
        setErrorHistory(true);
        console.log(error);
      });

  }, []);

   //useEffect(() => {
   // if(started){
   //   checkEndViewport();
   // }
  //}, [appLoaded]);


  // useEffect(() => {
    // if( isTyping){
      // document.getElementById('model-loading')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // }else{
    //   document.getElementById('last-line')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // }
  // }, [chats]);

  const chat = async (e, message) => {
    e.preventDefault();
    if (!message || isTyping) return;
    const imageInput = document.getElementById('imageInput');
    validateImage(imageInput);
    setIsTyping(true);

    gVoicePlayer.stopVoice();

    const imgBase64 = await getImage();
    if( imgBase64 === null) return;
    let msgs = chats;
    msgs.push({
      role: "user",
      parts: [{ text: message }],
      image_id : imgBase64?.type ? "tmp-id" : "",
      image_src: imgBase64?.type ? `${imgBase64.type},${imgBase64.source}` : ""
    });

    setChats(msgs);
    setMessage("");
    //if(imgBase64?.type){previewLastetImage(imgBase64);}
    resetImage();
    
    msgs = msgs.map(({ role, parts }) => ({ role, parts }));
    //msgs = msgs.map(({ parts, extra, ...rest }) => rest);
    endMessage();

    fetch(`${backend_uri}/chat`, {
      method: "POST",
      credentials : "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        history: msgs.length < 2 ? [] : msgs,
        msg: message,
        img: { type: imgBase64?.type, source : imgBase64?.source}
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if(data?.response?.blockReason){ alert("Text not available 🤡 ");return;}
        if(data?.text == null){ alert("Server is overloaded!");return;}
	      msgs = chats;
        msgs.push(
          data.text
        );
        setChats(msgs);
        endMessage();
        gVoicePlayer.setListVoice(data.voice);
        gVoicePlayer.playVoice();
        gVoicePlayer.updateListVoice();
        setIsTyping(false);
      })
      .catch((error) => {
        setIsTyping(false);
        console.log(error);
      });
  };

  class gVoice {
    maxLength = 200;
    voiceIndex = 0;
    listVoice = [];
    player;

    constructor(player){
      this.setPlayer(player);
      this.setAutoPlayList();
    }

    setPlayer(player) {
      this.player = player;
    }

    setListVoice(listVoice) {
      this.listVoice = listVoice;
    }

    updateListVoice(){
      this.listVoice.forEach((voice, index) => {
        if(voice?.base64 == ''  && voice?.text != '' && this.listVoice.length > 0){
          fetch(`${backend_uri}/voice`, {
            method: "POST",
            credentials : "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text : voice.text
            })
          })
          .then((response) => response.json())
          .then((data) => {
              if(this.listVoice.length >0) voice.base64 = data.voice;
            })
          .catch((error) => {
              console.log(error);
            });
        }
      });
    }

    setAutoPlayList(){
      let self = this;
      // this.player.onended = this.playVoice();
      this.player.addEventListener("ended", function(){
        self.playVoice();
      });
    }

    playVoice(){
      if (this.voiceIndex < this.listVoice.length) {
        let src = this.listVoice[this.voiceIndex]?.base64;
        if (src) {
          this.player.pause();
          this.player.src = "data:audio/mpeg;base64," + src;
          this.player.play().catch(error => {
            console.error('Error playing voice:', error);
          });
          this.voiceIndex++;
        }
      }
    };

    stopVoice(){
      this.player.pause();
      this.player.src = "";
      this.voiceIndex = 0;
      this.listVoice = [];
    }

  }

  const endMessage = (e= null) =>{
    if(e) e.preventDefault();
    started = true;
    setTimeout(() => {
      document.getElementById('end-section')?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  }

  const scrollEvent = () => {

    let isScrolling = false;
    const scrollButton = document.getElementById('scroll-down');
    const targetElement = document.getElementById('end-section');

    function checkScrollPosition() {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const targetRect = targetElement.getBoundingClientRect();
        const targetTop = scrollTop + targetRect.top;

        if (scrollTop + windowHeight + 100 < targetTop ) {
            scrollButton.style.display = 'block';
        } else {
            scrollButton.style.display = 'none';
        }

    }

    window.addEventListener('scroll', checkScrollPosition);
    window.addEventListener('resize', checkScrollPosition);
    checkScrollPosition();
  } 

  const checkEndViewport = () =>{
    let viewportTimer =  setInterval( function(){
      if(errorHistory){
        clearInterval(viewportTimer);
      }
      if (started){
        let endViewportEl = document.getElementById('end-section');
        if(endViewportEl.getBoundingClientRect().top >= 0 && endViewportEl.getBoundingClientRect().bottom -30 <= window.innerHeight){
          setAppLoaded(true);  
          setEndViewport(true);
          clearInterval(viewportTimer);
          document.body.classList.add('app-loaded');
          document.documentElement.classList.add('app-loaded');
        }
      }
    }, 500); 
  }

  const fileToBase64 = (file)  =>{
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onloadend = function () {
            resolve({
		type: reader.result.split(',')[0],
		source: reader.result.split(',')[1],
	    });
        };

        reader.onerror = function (error) {
            reject(error);
        };

        reader.readAsDataURL(file);
    });
  }

  const getImage = async () =>{
    let imgInput = document.getElementById('imageInput');
    let image = imgInput.files[0];
    let imgBase64 = "";
    if (image) {
        try {
          imgBase64 = await fileToBase64(image);
        } catch (error) {
            console.error('Error reading file:', error);
            alert('Error reading file');
            return null;
        }
    }

    return imgBase64;
  }

  const previewLastetImage = (imgBase64) =>{
    const imgs = document.getElementsByClassName('img-preview');
    const lastImg = imgs[imgs.length - 1];
    lastImg.src= imgBase64?.type + ',' + imgBase64.source;
  }

  const loadImage = async (event) =>{
    event.preventDefault();
    let iTag = event.target;
    let index = iTag.getAttribute('data-index');
    let recordId = iTag.getAttribute('data-image-id');
    let loaded = iTag.classList.contains('loaded');
    let ic_loading = iTag.parentElement.querySelector('.img-loading');
    let msg = chats[index];
    if( !recordId || loaded || msg.image_src){
      return;
    }
    ic_loading.classList.remove("hide");
    fetch(`${backend_uri}/getImage?id=${recordId}`,{credentials : "include"})
      .then(results => results.json())
      .then(data => {
        //msg.image_src = data.img;
        //setChats(msgs);
        //chats[index] = msg;
	iTag.src = data.img;
	iTag.classList.add("loaded");
	//console.log(chats);
      }).catch((error) => {
        console.log(error);
      }).finally(() =>{
        ic_loading.classList.add("hide");
      });
  }

  async function fetchImageBase64(recordId) {
    let image = '';
    if(!recordId || recordId == 'tmp-id') return '';
    try {
      const response = await fetch(`${backend_uri}/getImage?id=${recordId}`,{credentials : "include"});
  
      if (!response.ok) {
        //throw new Error('Network response was not ok');
      }
      
      image = await response.json();
    } catch (error) {
      console.log('error fetchImage:', error);
      //throw error;
    }
    return image;
  }

  const resetImage = () =>{
    document.getElementById('imageInput').value = null;
    document.getElementById('custom-file-msg').innerText = '';
    document.getElementById('resetImage').classList.add("hide");
  }

  const validateImage = (imageInput) =>{
    const image = imageInput.files[0];
    const MAX_SIZE_MB = 2.5;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
    if (image) {
        const fileType = image.type;
        if (!fileType.startsWith('image/')) {
            alert('Please select a valid image file.');
            resetImage();
            return;
        }
        if (image.size > MAX_SIZE_BYTES) {
            alert(`Image too large. Please select an image smaller than ${MAX_SIZE_MB}MB`);
            resetImage();
            return;
        }
    }else{
      resetImage();
      return;
    }
    applyImage();
  }

  const applyImage = () =>{
    const image = document.getElementById('imageInput').files[0];
    const btnReset = document.getElementById('resetImage');
    const fileMsg = document.getElementById('custom-file-msg');
    fileMsg.innerText = image?.name;
    btnReset.classList.remove("hide");
  }

  const zoomImage= () =>{
    const zoomContainer = document.querySelector('.image-container');
    const zoomImage = document.querySelector('.image-preview');

    zoomContainer.addEventListener('mousemove', function(e) {
        const { left, top, width, height } = zoomContainer.getBoundingClientRect();
        const x = e.clientX - left;
        const y = e.clientY - top;
        const percentX = (x / width) * 100;
        const percentY = (y / height) * 100;

        zoomImage.style.transformOrigin = `${percentX}% ${percentY}%`;
    });

    zoomContainer.addEventListener('mouseleave', function() {
        zoomImage.style.transformOrigin = 'center center';
    });
  }

  return (
    <main>
      <h1 className="page-title" >Gemini Chatbot</h1>
      <section className={ appLoaded ? '' : 'loading'}>
        {chats && chats.length
          ? chats.map((chat, index) => (
              <div className="line-container" key={index} id={ index == chats.length -1 ? "last-line" : ""}>
                <p className={chat.role === "user" ? "user_msg" : ""}>
                  <span>
                    <b>{chat.role==="user" ? " < Me" : <img className="gemini-icon" src="/sparkle.svg" /> }</b>
                  </span>
                  {/* { chat.role === 'user' ? <span className="message-content">{chat.parts[0]?.text}</span> : <span className="" dangerouslySetInnerHTML={{ __html: highlightCode(chat.parts[0]?.text) }}></span> } */}
                  { chat.role === 'user' ? <span className="message-content">{chat.parts[0]?.text}</span> : <CodeHighlighter content={chat.parts[0]?.text} /> }
                  
                </p>
                { chat?.image_id && chat.image_id != 'tmp-id' ? <LazyImage data-index={index} endViewport={endViewport} imageId={chat?.image_id} fetchImageBase64={fetchImageBase64}/> : ''}
                { chat.image_id == 'tmp-id' &&<div className="image-container" ><img className='img-preview loaded'src={ chat.image_src } / ></div> }
                
              </div>
            ))
          : ""}
        <div id="model-loading" className={isTyping ? "" : "hide"}>
            <p>
              <i>{isTyping ? <img className={`${isTyping ? 'loading ' : ''}gemini-icon`} src="/sparkle.svg" /> : ""}</i>
            </p>
        </div>
      </section>
      <div id="end-section"></div>
      <div id="scroll-down" className={ appLoaded || "hide" } onClick={ (e) => endMessage(e)}>
        <img src="/scroll-down.svg"/>
      </div>
      <audio id="gVoice" className="hide" type="audio/mp3" controls></audio>

      <form className="chat-form" action="" onSubmit={(e) => chat(e, message)}>
        <div className="custom-file">
          <button className="hide" type="button" id="resetImage" onClick={resetImage}>x</button>
          <span id="custom-file-msg" ></span>
        </div>
        
        <div className="custom-file">
          <input
          type="text"
          name="message"
          value={message}
          placeholder="Type a message here and hit Enter..."
          onChange={(e) => setMessage(e.target.value)}
        />
          <img id="custom-file-icon" src="/file_icon.svg" onClick={() => { document.getElementById('imageInput').click(); } } />
        </div>
        <input type="file" className="hide" id="imageInput" accept="image/*" onChange={(e) => validateImage(e.target)} />
         
      </form>
    </main>
  );
}
export default App;
