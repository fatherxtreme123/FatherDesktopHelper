const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

const settingsFilePath = path.join(__dirname, 'settings.json');

let apiKey, apiHost, model, temperature, topP, presencePenalty, frequencyPenalty;

function loadSettings() {
    try {
        const settings = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
        apiKey = settings.apiKey;
        apiHost = settings.apiHost;
        model = settings.model;
        temperature = settings.temperature;
        topP = settings.topP;
        presencePenalty = settings.presencePenalty;
        frequencyPenalty = settings.frequencyPenalty;

        document.getElementById('api-key').value = apiKey;
        document.getElementById('api-host').value = apiHost;
        document.getElementById('model').value = model;
        document.getElementById('temperature').value = temperature;
        document.getElementById('top-p').value = topP;
        document.getElementById('presence-penalty').value = presencePenalty;
        document.getElementById('frequency-penalty').value = frequencyPenalty;
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}
function saveSettings() {
    const settings = {
        apiKey: document.getElementById('api-key').value,
        apiHost: document.getElementById('api-host').value,
        model: document.getElementById('model').value,
        temperature: parseFloat(document.getElementById('temperature').value),
        topP: parseFloat(document.getElementById('top-p').value),
        presencePenalty: parseFloat(document.getElementById('presence-penalty').value),
        frequencyPenalty: parseFloat(document.getElementById('frequency-penalty').value)
    };

    fs.writeFileSync(settingsFilePath, JSON.stringify(settings), 'utf8');
}

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();

    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const saveSettingsBtn = document.getElementById('save-settings');
    const sendBtn = document.getElementById('send-btn');
    const userInput = document.getElementById('user-input');
    const output = document.getElementById('output');

    settingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'block';
    });

    saveSettingsBtn.addEventListener('click', () => {
        saveSettings();
        settingsModal.style.display = 'none';
    });

    const captureScreenAndSendMessage = async () => {
        try {
            await ipcRenderer.invoke('HIDE_WINDOW');
            const sources = await ipcRenderer.invoke('DESKTOP_CAPTURER_GET_SOURCES', { types: ['screen'] });
            const entireScreen = sources[0];
            const thumbnail = entireScreen.thumbnail.toDataURL(); 
            await ipcRenderer.invoke('SHOW_WINDOW');

            await sendMessage(thumbnail.split(',')[1]); 
        } catch (error) {
            console.error('Error capturing screen:', error);
            output.innerHTML += `<p><strong>Error:</strong> Failed to capture screen: ${error.message}</p>`;
        }
    };

    const sendMessage = async (base64Image) => {
        const userMessage = userInput.value;
        output.innerHTML = '';

        const messages = [
            { role: 'system', content: 'You are a helpful assistant capable of analyzing images.' },
            {
                role: 'user',
                content: [
                    { type: 'text', text: userMessage || "What's in this image?" },
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:image/jpeg;base64,${base64Image}`,
                            detail: 'low'
                        }
                    }
                ]
            }
        ];

        try {
            const response = await fetch(`${apiHost}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,  
                    messages: messages,
                    max_tokens: 300,
                    temperature: temperature,
                    top_p: topP,
                    presence_penalty: presencePenalty,
                    frequency_penalty: frequencyPenalty,
                    stream: true  
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const reader = response.body.getReader();
            let decoder = new TextDecoder();
            let partialContent = '';
            let assistantOutput = document.createElement('p');
            assistantOutput.innerHTML = `<strong>Assistant:</strong> `;
            output.appendChild(assistantOutput);
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                partialContent += decoder.decode(value, { stream: true });
                const chunks = partialContent.split('\n\n');

                chunks.slice(0, -1).forEach(chunk => {
                    if (chunk) {
                        try {
                            const data = JSON.parse(chunk.substring(6)); 
                            if (data.choices[0].delta.content) {
                                assistantOutput.innerHTML += data.choices[0].delta.content;
                            }
                        } catch (e) {
                            console.error('Error parsing chunk:', e);
                        }
                    }
                });

                partialContent = chunks[chunks.length - 1];
            }
        } catch (error) {
            console.error('Error:', error);
            output.innerHTML += `<p><strong>Error:</strong> ${error.message}</p>`;
        }
    };

    sendBtn.addEventListener('click', captureScreenAndSendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            captureScreenAndSendMessage();
        }
    });
});