// ==UserScript==
// @name         Voice Chat
// @namespace    https://github.com/Foxi005305/Emberveil-Mods
// @version      1.0.0
// @description  Голосовой чат с Push-to-Talk для игры Emberveil
// @author       Foxi005305
// @match        https://emberveil.vercel.app/*
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
        pushToTalkKey: 'KeyV',
        wsServerUrl: 'wss://emberveil.vercel.app/socket' // WebSocket эндпоинт сервера
    };

    let localStream = null;
    let audioTrack = null;
    let isTalking = false;
    let peerConnections = {};
    let ws = null;

    // --- INTERFACE (UI) ---
    function createUI() {
        const container = document.createElement('div');
        container.id = 'emberveil-voice-ui';
        container.innerHTML = `
            <div class="ev-voice-card">
                <div class="ev-voice-header">
                    <span class="ev-voice-dot" id="ev-status-dot"></span>
                    <span class="ev-voice-title">Emberveil Voice Chat</span>
                </div>
                <div class="ev-voice-body">
                    <div id="ev-voice-status">Статус: Подключение...</div>
                    <div class="ev-voice-hint">Зажмите <kbd>V</kbd> для разговора</div>
                </div>
            </div>
        `;
        document.body.appendChild(container);

        const styles = `
            #emberveil-voice-ui {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 999999;
                font-family: 'Segoe UI', system-ui, sans-serif;
                user-select: none;
            }
            .ev-voice-card {
                background: rgba(18, 18, 24, 0.75);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 12px 16px;
                color: #ffffff;
                box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
                min-width: 200px;
            }
            .ev-voice-header {
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 600;
                font-size: 14px;
                margin-bottom: 6px;
            }
            .ev-voice-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background-color: #ff4757;
                box-shadow: 0 0 8px #ff4757;
                transition: all 0.3s ease;
            }
            .ev-voice-dot.active {
                background-color: #2ed573;
                box-shadow: 0 0 8px #2ed573;
            }
            .ev-voice-body {
                font-size: 12px;
                color: #a4b0be;
            }
            .ev-voice-hint {
                margin-top: 4px;
                font-size: 11px;
                color: #747d8c;
            }
            kbd {
                background: rgba(255, 255, 255, 0.15);
                border-radius: 4px;
                padding: 1px 5px;
                color: #fff;
            }
        `;

        if (typeof GM_addStyle !== 'undefined') {
            GM_addStyle(styles);
        } else {
            const styleNode = document.createElement('style');
            styleNode.textContent = styles;
            document.head.appendChild(styleNode);
        }
    }

    // --- MICROPHONE INIT ---
    async function initMicrophone() {
        const statusText = document.getElementById('ev-voice-status');
        const statusDot = document.getElementById('ev-status-dot');

        try {
            localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });

            audioTrack = localStream.getAudioTracks()[0];
            audioTrack.enabled = false; // Push-to-Talk по умолчанию выключен

            if (statusText) statusText.textContent = 'Статус: Готов (PTT)';
            if (statusDot) statusDot.classList.add('active');

            setupPushToTalk();
        } catch (err) {
            console.error('[Emberveil Voice] Ошибка доступа к микрофону:', err);
            if (statusText) statusText.textContent = 'Ошибка: Доступ к микрофону закрыт';
        }
    }

    // --- PUSH TO TALK ---
    function setupPushToTalk() {
        const statusText = document.getElementById('ev-voice-status');

        window.addEventListener('keydown', (e) => {
            if (e.code === CONFIG.pushToTalkKey && !isTalking && audioTrack) {
                isTalking = true;
                audioTrack.enabled = true;
                if (statusText) statusText.textContent = 'Статус: Трансляция... 🎙️';
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === CONFIG.pushToTalkKey && isTalking && audioTrack) {
                isTalking = false;
                audioTrack.enabled = false;
                if (statusText) statusText.textContent = 'Статус: Готов (PTT)';
            }
        });
    }

    // --- WEBRTC SIGNALING ---
    function initWebRTCNetwork() {
        // Если у игры уже есть свой глобальный сокет, можно подключиться к нему
        if (window.socket) {
            ws = window.socket;
        }

        window.EmberveilVoice = {
            getStream: () => localStream,
            isSpeaking: () => isTalking,
            connectToPlayer: (peerId) => {
                const pc = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                });

                if (localStream) {
                    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
                }

                pc.ontrack = (event) => {
                    const audio = new Audio();
                    audio.srcObject = event.streams[0];
                    audio.autoplay = true;
                };

                peerConnections[peerId] = pc;
                return pc;
            }
        };
    }

    // --- LAUNCH ---
    window.addEventListener('load', () => {
        createUI();
        initMicrophone();
        initWebRTCNetwork();
    });

})();
