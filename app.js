// ===== CONFIG =====
let API_KEY = localStorage.getItem('claude_api_key') || 'REMOVED';
const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

// ===== ELEMENTS =====
const avatar = document.getElementById('avatar');
const mouth = document.getElementById('mouth');
const coreLight = document.getElementById('coreLight');
const status = document.getElementById('status');
const chatMessages = document.getElementById('chatMessages');
const micBtn = document.getElementById('micBtn');
const micLabel = document.getElementById('micLabel');
const audioVisualizer = document.getElementById('audioVisualizer');
const apiModal = document.getElementById('apiModal');
const apiKeyInput = document.getElementById('apiKeyInput');

// ===== STATE =====
let isListening = false;
let recognition = null;
let synthesis = window.speechSynthesis;
let conversationHistory = [];
let currentUtterance = null;

// ===== INIT =====
function init() {
    createParticles();

    if (!API_KEY) {
        apiModal.classList.remove('hidden');
    } else {
        apiModal.classList.add('hidden');
    }

    // Setup Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'fr-FR';
        recognition.interimResults = true;
        recognition.continuous = false;

        recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript) {
                handleUserMessage(finalTranscript);
            }
        };

        recognition.onend = () => {
            if (isListening) {
                stopListening();
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error !== 'no-speech') {
                stopListening();
            }
        };
    } else {
        micLabel.textContent = 'Micro non supporté';
        micBtn.disabled = true;
    }

    // Preload voices
    synthesis.getVoices();
    synthesis.onvoiceschanged = () => synthesis.getVoices();
}

// ===== API KEY =====
function saveApiKey() {
    const key = apiKeyInput.value.trim();
    if (key) {
        API_KEY = key;
        localStorage.setItem('claude_api_key', key);
        apiModal.classList.add('hidden');
    }
}

// ===== PARTICLES =====
function createParticles() {
    const container = document.getElementById('particles');
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (Math.random() * 8 + 4) + 's';
        particle.style.animationDelay = Math.random() * 8 + 's';
        particle.style.width = (Math.random() * 3 + 1) + 'px';
        particle.style.height = particle.style.width;
        container.appendChild(particle);
    }
}

// ===== LISTENING =====
function toggleListening() {
    if (currentUtterance) {
        synthesis.cancel();
        currentUtterance = null;
        setAvatarState('idle');
    }

    if (isListening) {
        stopListening();
    } else {
        startListening();
    }
}

function startListening() {
    if (!recognition) return;

    isListening = true;
    micBtn.classList.add('active');
    micLabel.textContent = 'Je t\'écoute...';
    audioVisualizer.classList.add('active');
    setAvatarState('listening');

    // Animate visualizer
    startVisualizerAnimation();

    try {
        recognition.start();
    } catch (e) {
        // Already started
    }
}

function stopListening() {
    isListening = false;
    micBtn.classList.remove('active');
    micLabel.textContent = 'Appuie pour parler';
    audioVisualizer.classList.remove('active');

    stopVisualizerAnimation();

    try {
        recognition.stop();
    } catch (e) {}
}

// ===== VISUALIZER =====
let vizInterval = null;

function startVisualizerAnimation() {
    const bars = audioVisualizer.querySelectorAll('.viz-bar');
    vizInterval = setInterval(() => {
        bars.forEach(bar => {
            const height = Math.random() * 30 + 6;
            bar.style.height = height + 'px';
        });
    }, 100);
}

function stopVisualizerAnimation() {
    if (vizInterval) {
        clearInterval(vizInterval);
        vizInterval = null;
    }
    const bars = audioVisualizer.querySelectorAll('.viz-bar');
    bars.forEach(bar => bar.style.height = '6px');
}

// ===== AVATAR STATES =====
function setAvatarState(state) {
    avatar.className = 'avatar';
    status.className = 'status';
    mouth.className = 'mouth';

    switch (state) {
        case 'listening':
            avatar.classList.add('listening');
            status.classList.add('listening');
            status.querySelector('span').textContent = 'Écoute';
            break;
        case 'thinking':
            avatar.classList.add('thinking');
            status.classList.add('thinking');
            status.querySelector('span').textContent = 'Réflexion';
            break;
        case 'speaking':
            avatar.classList.add('speaking');
            status.classList.add('speaking');
            mouth.classList.add('speaking');
            status.querySelector('span').textContent = 'Parle';
            break;
        default:
            status.querySelector('span').textContent = 'Prêt';
    }
}

// ===== MESSAGES =====
function addMessage(text, isUser) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    msgDiv.innerHTML = `<p>${text}</p>`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function handleUserMessage(text) {
    stopListening();
    addMessage(text, true);
    setAvatarState('thinking');

    conversationHistory.push({ role: 'user', content: text });

    try {
        const response = await callClaude(text);
        conversationHistory.push({ role: 'assistant', content: response });
        addMessage(response, false);
        speak(response);
    } catch (error) {
        console.error('API Error:', error);
        const errMsg = 'Désolé, j\'ai eu un problème de connexion. Réessaie.';
        addMessage(errMsg, false);
        speak(errMsg);
    }
}

// ===== CLAUDE API =====
async function callClaude(userMessage) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
            model: MODEL,
            max_tokens: 1024,
            system: `Tu es un assistant IA avec un corps holographique humanoïde. Tu parles en français.
Tu es amical, naturel et concis dans tes réponses car elles seront lues à voix haute.
Garde tes réponses courtes (2-3 phrases max) pour que ce soit agréable à écouter.
Tu t'appelles Claude. Tu es créé par Anthropic.
Ne mets pas de formatage markdown, astérisques ou caractères spéciaux dans tes réponses car elles sont lues à voix haute.`,
            messages: conversationHistory.slice(-20) // Keep last 20 messages for context
        })
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
}

// ===== TEXT TO SPEECH =====
function speak(text) {
    synthesis.cancel();
    setAvatarState('speaking');

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 1.05;
    utterance.pitch = 0.95;

    // Try to find a good French voice
    const voices = synthesis.getVoices();
    const frenchVoice = voices.find(v => v.lang.startsWith('fr') && v.name.includes('Thomas'))
        || voices.find(v => v.lang.startsWith('fr') && v.name.includes('Daniel'))
        || voices.find(v => v.lang.startsWith('fr') && !v.name.includes('Google'))
        || voices.find(v => v.lang.startsWith('fr'));

    if (frenchVoice) {
        utterance.voice = frenchVoice;
    }

    // Animate mouth during speech
    utterance.onstart = () => {
        currentUtterance = utterance;
        audioVisualizer.classList.add('active');
        startVisualizerAnimation();
    };

    utterance.onend = () => {
        currentUtterance = null;
        setAvatarState('idle');
        audioVisualizer.classList.remove('active');
        stopVisualizerAnimation();
    };

    utterance.onerror = () => {
        currentUtterance = null;
        setAvatarState('idle');
        audioVisualizer.classList.remove('active');
        stopVisualizerAnimation();
    };

    synthesis.speak(utterance);
}

// ===== KEYBOARD SHORTCUT =====
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        toggleListening();
    }
});

// Allow Enter key on API input
apiKeyInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveApiKey();
});

// ===== START =====
init();
