const promptElement = document.getElementsByClassName("prompt")[0];
const responseElement = document.getElementsByClassName("response")[0];
const errorElement = document.getElementsByClassName("error")[0];
const mouth = document.getElementsByClassName("mouth")[0];
const eyes = document.getElementsByClassName("eye");
const voiceSelect = document.querySelector("#voice-select");
const langSelect = document.querySelector("#lang-select");
const pitch = document.querySelector("#pitch");
const rate = document.querySelector("#rate");

let prompt = "Hello";
let response = "Hello, Im PAC, your very own personal assistant, how can i help you";
let error = "";

let isSleeping = false;
let isIdle = true;
let isListening = false;
let isProcessing = false;
let isSpeaking = false;

const populateVoiceList = () => {
  voices = speechSynthesis.getVoices();

  for (const voice of voices) {
    const option = document.createElement("option");
    option.textContent = `${voice.name} (${voice.lang})`;

    if (voice.default) {
      option.textContent += " — DEFAULT";
    }

    option.setAttribute("data-lang", voice.lang);
    option.setAttribute("data-name", voice.name);
    voiceSelect.appendChild(option);
  }
}

populateVoiceList();
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = populateVoiceList;
}

const getPitch = (min, max) => {
    return 100
}

const listen = async (lang="en-GB") => {
    const recognitionSvc = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new recognitionSvc();

    try {
        recognition.continuous = false;
        recognition.lang = lang;
        recognition.start();
        recognition.onresult = (event) => { 
            console.log("got some results")
            for (const result of event.results) {
                return { error: null, result: result[0].transcript }
            }
        }
        recognition.stop();
    } catch(err) {
        return { error: err }
    }
}

const respond = async (prompt) => {
    try {
        const response = await fetch("https://onuri-asst.hf.space/run/predict", {
	        method: "POST",
	        headers: { "Content-Type": "application/json" },
	        body: JSON.stringify({
		        data: [ prompt ]
	        })
	    })
        const data = await response.json();
        console.log(data.data)
	    return { error: null, result: data };
	} catch(err) {
	    return { error: err };
	}
    return { error: null, result: "How can i help you." }
}

const speak = (text, selectedOption) => {
    try {
        if ('speechSynthesis' in window) {
            let msg = new SpeechSynthesisUtterance();
            msg.text = text;

            for (const voice of voices) {
                if (voice.name === selectedOption) {
                    msg.voice = voice;
                }
            }

            msg.pitch = pitch.value;
            msg.rate = rate.value;

            speechSynthesis.speak(msg);
        } else {
            throw(Error("Error: your browser does not support speech speechSynthesis, try another browser or read the provided text response"));
        }
        return { error: null }
    } catch(err) {
        return { error: err }
    }
}

const render = async () => {
    if (isIdle) {
        // Manipulate DOM
        eyes[0].style.display = "block";
        eyes[1].style.display = "block";
        mouth.style.display = "none";
        responseElement.style.display = "none";

        promptElement.innerText = "*Click to listen*";

        // Trigger animation
        eyes[0].style.animation = "eye_l_idle 30s cubic-bezier(1, 0, 0, 1) infinite";
        eyes[1].style.animation = "eye_r_idle 30s cubic-bezier(1, 0, 0, 1) infinite";

        // Sleep timeout
        setTimeout(() => {
            isIdle = false;
            isSleeping = true;
            render();
        }, 60000);

        // listen state trigger
        document.onclick = () => {
            isIdle = false
            isListening = true;
            render();
        }
    } else if (isSleeping) {
        // Manipulate DOM
        eyes[0].style.display = "block";
        eyes[1].style.display = "block";
        mouth.style.display = "none";
        responseElement.style.display = "none";
        promptElement.style.display = "block";

        promptElement.innerText = "*Click to wake up*"
        responseElement.innerText = response;

        // Trigger animations
        eyes[0].style.animation = "sleep 5s linear infinite";
        eyes[1].style.animation = "sleep 5s linear infinite";

        // listen state trigger
        document.onclick = () => {
            isSleeping = false;
            isListening = true;
            render();
        }
    } else if (isListening) {
        // Manipulate DOM
        mouth.style.display = "block";
        eyes[0].style.display = "none";
        eyes[1].style.display = "none";
        responseElement.style.display = "none";

        promptElement.innerText = "Listening...";

        const selectedLanguage = langSelect.selectedOptions[0].value;
        let data = await listen();

        if (data.error) {
            mouth.style.animation = "error 0.5s cubic-bezier(1, 0, 0, 1) 1"
            errorElement.innerText = data.error

            setTimeout(() => {
                errorElement.innerText = ""
            }, 5000);
        } else {
            prompt = data.result || "...";
            isListening = false;
            isProcessing = true;
            render();
        }
    } else if (isProcessing) {
        mouth.style.display = "none";
        eyes[0].style.display = "block";
        eyes[1].style.display = "block";
        responseElement.style.display = "none";

        let data = await respond();

        if (data.error) {
            eyes[0].style.animation = "error 0.5s cubic-bezier(1, 0, 0, 1) 1"
            eyes[1].style.animation = "error 0.5s cubic-bezier(1, 0, 0, 1) 1"
            errorElement.innerText = data.error;

            setTimeout(() => {
                errorElement.innerText = ""
            }, 5000);
        } else {
            response = data.result;

            promptElement.innerText = prompt;

            isProcessing = false;
            isSpeaking = true;
            render();
        }
    } else if (isSpeaking) {
        mouth.style.display = "block";
        eyes[0].style.display = "none";
        eyes[1].style.display = "none";
        responseElement.style.display = "block";

        promptElement.innerText = prompt;
        responseElement.innerText = response;

        responseElement.onclick = async (event) => {
            const selectedVoice = voiceSelect.selectedOptions[0].getAttribute('data-name');
            let data = await speak(response, selectedVoice);
            
           if (data.error) {
                mouth.style.animation = "error 0.5s cubic-bezier(1, 0, 0, 1) 1"
                errorElement.innerText = data.error;
                setTimeout(() => {
                    errorElement.innerText = "";
                }, 5000);
            }
        }
        setTimeout(() => {
            isSpeaking = false;
            isIdle = true;
            render();
        }, 60000);
    } else {
        isIdle = true;
        isSleeping = false;
        isListening = false;
        isProcessing = false;
        isSpeaking = false;

        render();
    }
}
render();

