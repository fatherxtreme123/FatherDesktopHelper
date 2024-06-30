const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

const settingsFilePath = path.join(__dirname, 'settings.json');
const defaultSettings = {
    apiKey: '',
    apiHost: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    temperature: 0.7,
    topP: 1,
    presencePenalty: 0,
    frequencyPenalty: 0,
    minimizeOnClose: true,
    alwaysOnTop: true,
    startOnBoot: false
};

let settings;

function loadSettings() {
    try {
        settings = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
    } catch (error) {
        console.error('Error loading settings:', error);
        settings = { ...defaultSettings };
    }
    applySettingsToUI(settings);
}

function saveSettings() {
    const newSettings = {
        apiKey: document.getElementById('api-key').value,
        apiHost: document.getElementById('api-host').value,
        model: document.getElementById('model').value,
        temperature: parseFloat(document.getElementById('temperature').value),
        topP: parseFloat(document.getElementById('top-p').value),
        presencePenalty: parseFloat(document.getElementById('presence-penalty').value),
        frequencyPenalty: parseFloat(document.getElementById('frequency-penalty').value),
        minimizeOnClose: document.getElementById('minimize-on-close').checked,
        alwaysOnTop: document.getElementById('always-on-top').checked,
        startOnBoot: document.getElementById('start-on-boot').checked
    };
    
    settings = newSettings;
    fs.writeFileSync(settingsFilePath, JSON.stringify(newSettings), 'utf8');
    applySettings();
}

function applySettingsToUI(settings) {
    document.getElementById('api-key').value = settings.apiKey;
    document.getElementById('api-host').value = settings.apiHost;
    document.getElementById('model').value = settings.model;
    document.getElementById('temperature').value = settings.temperature;
    document.getElementById('top-p').value = settings.topP;
    document.getElementById('presence-penalty').value = settings.presencePenalty;
    document.getElementById('frequency-penalty').value = settings.frequencyPenalty;
    document.getElementById('minimize-on-close').checked = settings.minimizeOnClose;
    document.getElementById('always-on-top').checked = settings.alwaysOnTop;
    document.getElementById('start-on-boot').checked = settings.startOnBoot;
}

function restoreDefaultSettings() {
    settings = { ...defaultSettings };
    applySettingsToUI(settings);
}

function applySettings() {
    ipcRenderer.send('apply-settings', settings);
}

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();

    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const saveSettingsBtn = document.getElementById('save-settings');
    const cancelSettingsBtn = document.getElementById('cancel-settings');
    const restoreDefaultSettingsBtn = document.getElementById('restore-default-settings');
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

    cancelSettingsBtn.addEventListener('click', () => {
        loadSettings();
        settingsModal.style.display = 'none';
    });

    restoreDefaultSettingsBtn.addEventListener('click', () => {
        restoreDefaultSettings();
    });

    const captureScreenAndSendMessage = async () => {
        try {
            await ipcRenderer.invoke('HIDE_WINDOW');
            const sources = await ipcRenderer.invoke('DESKTOP_CAPTURER_GET_SOURCES', {
                types: ['screen']
            });
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

        const messages = [{
                role: 'system',
                content: 'You are a helpful assistant. The shorter your answer, the better. If an explanation is not necessary, don\'t explain.'
            },
            {
                role: 'user',
                content: [{
                        type: 'text',
                        text: userMessage
                    },
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
            const response = await fetch(`${settings.apiHost}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.apiKey}`
                },
                body: JSON.stringify({
                    model: settings.model,
                    messages: messages,
                    max_tokens: 300,
                    temperature: settings.temperature,
                    top_p: settings.topP,
                    presence_penalty: settings.presencePenalty,
                    frequency_penalty: settings.frequencyPenalty,
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
                const {
                    done,
                    value
                } = await reader.read();
                if (done) break;

                partialContent += decoder.decode(value, {
                    stream: true
                });
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

    // Add global shortcut listener
    ipcRenderer.on('trigger-app', () => {
        mainWindow.show();
    });
});