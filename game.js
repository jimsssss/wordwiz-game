// WordWiz Client-Side Multiplayer Game
// Connects to Socket.IO server for real-time multiplayer

// Socket connection
const socket = io();

// Game State
const GameState = {
    roomCode: null,
    playerName: null,
    isHost: false,
    players: [],
    currentRound: 0,
    currentChallenge: null,
    timeLeft: 30,
    timerInterval: null,
    countdownInterval: null,  // Track countdown interval
    animationFrame: null,     // Track animation frame for smoother timer
    selectedTimer: 20  // Default 20 seconds
};

// Music System - Optimized for better loading and performance
const Music = {
    lobby: null,
    endGame: null,
    countdownStart3s: null,
    countdownStart5s: null,
    countdown10s: ['music/10s-1.mp3'],
    countdown20s: ['music/20s-1.mp3', 'music/20s-2.mp3'],
    countdown30s: ['music/30s-1.mp3', 'music/30s-2.mp3'],
    currentCountdown: null,
    currentBgMusic: null,
    initialized: false,
    globalVolume: 1.0
};

// Sound Effects (simple beep sounds)
const Sounds = {
    incorrect: null,
    tick: null
};

// Initialize audio files with proper error handling
function initializeAudio() {
    if (Music.initialized) return;
    
    try {
        // Create audio objects with error handling
        Music.lobby = createAudioWithSettings('music/lobby.mp3', { loop: true, volume: 0.3 });
        Music.endGame = createAudioWithSettings('music/end-game.mp3', { loop: false, volume: 0.4 });
        Music.countdownStart3s = createAudioWithSettings('music/3s-count-start.mp3', { volume: 0.4 });
        Music.countdownStart5s = createAudioWithSettings('music/5s-count-start.mp3', { volume: 0.4 });
        
        // Simple sound effects using Web Audio API for better compatibility
        Sounds.incorrect = createBeepSound(300, 0.2, 0.3); // 300Hz, 0.2s duration, 0.3 volume
        Sounds.tick = createBeepSound(800, 0.1, 0.2); // 800Hz, 0.1s duration, 0.2 volume
        
        Music.initialized = true;
        console.log('Audio initialized successfully');
    } catch (error) {
        console.warn('Audio initialization failed:', error);
        // Create silent fallback audio objects
        Music.lobby = createSilentAudio();
        Music.endGame = createSilentAudio();
        Music.countdownStart3s = createSilentAudio();
        Music.countdownStart5s = createSilentAudio();
        Sounds.incorrect = createSilentAudio();
        Sounds.tick = createSilentAudio();
        Music.initialized = true;
    }
}

// Create audio with proper settings and error handling
function createAudioWithSettings(src, settings = {}) {
    const audio = new Audio();
    audio.preload = 'metadata'; // Only load metadata initially for better performance
    audio.volume = settings.volume || 0.5;
    audio.loop = settings.loop || false;
    
    // Set source with error handling
    audio.addEventListener('error', (e) => {
        console.warn(`Failed to load audio: ${src}`, e);
    });
    
    audio.addEventListener('canplaythrough', () => {
        console.log(`Audio ready: ${src}`);
    });
    
    audio.src = src;
    return audio;
}

// Create a simple beep sound using Web Audio API
function createBeepSound(frequency, duration, volume) {
    return {
        play: () => {
            if (!window.AudioContext && !window.webkitAudioContext) return;
            
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = frequency;
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + duration);
            } catch (error) {
                console.warn('Web Audio API failed:', error);
            }
        },
        pause: () => {}, // No-op for beep sounds
        currentTime: 0
    };
}

// Create silent audio fallback
function createSilentAudio() {
    return {
        play: () => Promise.resolve(),
        pause: () => {},
        currentTime: 0,
        volume: 0,
        loop: false
    };
}

// Helper function to play music (for ALL players)
function playMusic(audio, loop = false) {
    // Play music for ALL players without any restrictions
    stopAllMusic();
    if (audio) {
        audio.loop = loop;
        audio.currentTime = 0;
        // Set appropriate volume based on audio type
        if (audio === Music.lobby) audio.volume = 0.15;
        else if (audio === Music.endGame) audio.volume = 0.4;
        else audio.volume = 0.35;
        audio.play().catch(e => console.log('Music play failed:', e));
        Music.currentBgMusic = audio;
    }
}

// Helper function to get random countdown music
function getRandomCountdownMusic(duration) {
    let tracks;
    if (duration === 10) tracks = Music.countdown10s;
    else if (duration === 20) tracks = Music.countdown20s;
    else tracks = Music.countdown30s;
    
    const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
    const audio = new Audio(randomTrack);
    audio.volume = 0.35;
    return audio;
}

// Helper function to stop all music
function stopAllMusic() {
    if (Music.currentBgMusic) {
        Music.currentBgMusic.pause();
        Music.currentBgMusic.currentTime = 0;
        Music.currentBgMusic = null;
    }
    if (Music.currentCountdown) {
        Music.currentCountdown.pause();
        Music.currentCountdown.currentTime = 0;
        Music.currentCountdown = null;
    }
}

// Background music management - play ambient music when no other music is playing
function startBackgroundMusic() {
    // Play for ALL players - mute button controls local volume only
    
    // Don't start if music is already playing
    if (Music.currentBgMusic && !Music.currentBgMusic.paused) return;
    if (Music.currentCountdown && !Music.currentCountdown.paused) return;
    
    // Use lobby music as background
    setTimeout(() => {
        // Double-check no music is playing after delay
        if ((!Music.currentBgMusic || Music.currentBgMusic.paused) && 
            (!Music.currentCountdown || Music.currentCountdown.paused)) {
            console.log('Starting background music...');
            playMusic(Music.lobby, true);
        }
    }, 2000); // 2-second delay to allow for transitions
}

// DOM Elements
let hostScreen, roomCodeScreen, joinScreen, waitingScreen, gameScreen, midGameScreen, endScreen;
let createRoomBtn, joinRoomBtn, backToHomeBtn;
let displayRoomCode, qrCode, joinUrl, playerCount, lobbyPlayersList;
let codeDigitInputs, playerNameInput, joinGameBtn;
let currentRoomCode, currentPlayerName, waitingPlayersList;
let startGameBtn, currentRoundEl, timerText, timerCircle;
let firstLetterEl, lastLetterEl, startLetter, endLetter;
let answerInput, submitAnswerBtn, feedbackMessage, roundWinner;
let scoreboardList, finalScoresList, winnerNameEl, newGameBtn;
let midGameRound, midGameTotal, midGameRankings;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    attachEventListeners();
    setupSocketListeners();
    initializeAudio(); // Initialize audio system
    
    // Start background music on homepage
    startHomepageMusic();
});

// Initialize all DOM elements
function initializeElements() {
    // Screens
    hostScreen = document.getElementById('hostScreen');
    roomCodeScreen = document.getElementById('roomCodeScreen');
    joinScreen = document.getElementById('joinScreen');
    waitingScreen = document.getElementById('waitingScreen');
    gameScreen = document.getElementById('gameScreen');
    midGameScreen = document.getElementById('midGameScreen');
    endScreen = document.getElementById('endScreen');
    
    // Mid-game screen
    midGameRound = document.getElementById('midGameRound');
    midGameTotal = document.getElementById('midGameTotal');
    midGameRankings = document.getElementById('midGameRankings');
    
    // Host screen
    createRoomBtn = document.getElementById('createRoomBtn');
    joinRoomBtn = document.getElementById('joinRoomBtn');
    
    // Room code screen
    displayRoomCode = document.getElementById('displayRoomCode');
    qrCode = document.getElementById('qrCode');
    joinUrl = document.getElementById('joinUrl');
    playerCount = document.getElementById('playerCount');
    lobbyPlayersList = document.getElementById('lobbyPlayersList');
    startGameBtn = document.getElementById('startGameBtn');
    
    // Join screen
    codeDigitInputs = document.querySelectorAll('.code-digit');
    playerNameInput = document.getElementById('playerNameInput');
    joinGameBtn = document.getElementById('joinGameBtn');
    backToHomeBtn = document.getElementById('backToHomeBtn');
    
    // Waiting screen
    currentRoomCode = document.getElementById('currentRoomCode');
    currentPlayerName = document.getElementById('currentPlayerName');
    waitingPlayersList = document.getElementById('waitingPlayersList');
    
    // Game screen
    currentRoundEl = document.getElementById('currentRound');
    timerText = document.getElementById('timerText');
    timerCircle = document.getElementById('timerCircle');
    firstLetterEl = document.getElementById('firstLetter');
    lastLetterEl = document.getElementById('lastLetter');
    startLetter = document.getElementById('startLetter');
    endLetter = document.getElementById('endLetter');
    answerInput = document.getElementById('answerInput');
    submitAnswerBtn = document.getElementById('submitAnswerBtn');
    feedbackMessage = document.getElementById('feedbackMessage');
    roundWinner = document.getElementById('roundWinner');
    scoreboardList = document.getElementById('scoreboardList');
    
    // End screen
    finalScoresList = document.getElementById('finalScoresList');
    winnerNameEl = document.getElementById('winnerName');
    newGameBtn = document.getElementById('newGameBtn');
}

// Attach event listeners
function attachEventListeners() {
    createRoomBtn.addEventListener('click', createRoom);
    joinRoomBtn.addEventListener('click', () => switchScreen(joinScreen));
    backToHomeBtn.addEventListener('click', () => switchScreen(hostScreen));
    
    // Mechanics button
    const mechanicsBtn = document.getElementById('mechanicsBtn');
    if (mechanicsBtn) {
        mechanicsBtn.addEventListener('click', openMechanicsModal);
    }
    
    // Timer selection buttons
    document.querySelectorAll('.timer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.timer-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            GameState.selectedTimer = parseInt(btn.dataset.duration);
        });
    });
    
    // Auto-focus next letter input
    codeDigitInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            // Convert to uppercase and allow only letters
            const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
            e.target.value = value;
            
            if (value.length === 1 && index < codeDigitInputs.length - 1) {
                codeDigitInputs[index + 1].focus();
            }
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                codeDigitInputs[index - 1].focus();
            }
        });
    });
    
    joinGameBtn.addEventListener('click', joinRoom);
    playerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinRoom();
    });
    
    startGameBtn.addEventListener('click', startGame);
    
    submitAnswerBtn.addEventListener('click', submitAnswer);
    answerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitAnswer();
    });
    
    newGameBtn.addEventListener('click', () => {
        location.reload();
    });
}

// Setup Socket.IO listeners
function setupSocketListeners() {
    // Room created
    socket.on('roomCreated', ({ roomCode, serverURL, serverIP, serverPort }) => {
        GameState.roomCode = roomCode;
        GameState.isHost = true;
        
        displayRoomCode.textContent = roomCode;
        currentRoomCode.textContent = roomCode;
        
        // Generate QR code using the actual server URL (for deployed environments) or local IP
        const url = serverURL ? `${serverURL}?join=${roomCode}` : `http://${serverIP}:${serverPort}?join=${roomCode}`;
        joinUrl.textContent = url;
        
        qrCode.innerHTML = '';
        new QRCode(qrCode, {
            text: url,
            width: 200,
            height: 200
        });
        
        console.log(`QR Code generated for: ${url}`);
        
        // Play lobby music
        playMusic(Music.lobby, true);
        
        switchScreen(roomCodeScreen);
    });
    
    // Player joined
    socket.on('playerJoined', ({ players }) => {
        GameState.players = players;
        updatePlayersList(players);
        
        // Also update waiting players list for non-host players
        updateWaitingPlayersList(players);
        
        playerCount.textContent = players.length;
        startGameBtn.disabled = players.length < 2;
        startGameBtn.textContent = players.length < 2 ? 
            'Start Game (Need 2+ Players)' : 
            `Start Game (${players.length} Players)`;
    });
    
    // Joined room successfully
    socket.on('joinedRoom', ({ roomCode, playerName, players }) => {
        GameState.roomCode = roomCode;
        GameState.playerName = playerName;
        GameState.players = players;
        
        currentRoomCode.textContent = roomCode;
        currentPlayerName.textContent = playerName;
        
        updateWaitingPlayersList(players);
        
        // Keep lobby music playing
        if (!Music.currentBgMusic || Music.currentBgMusic.paused) {
            playMusic(Music.lobby, true);
        }
        
        switchScreen(waitingScreen);
    });
    
    // Join error
    socket.on('joinError', ({ message }) => {
        alert(message);
    });
    
    // Player left
    socket.on('playerLeft', ({ playerName, players }) => {
        GameState.players = players;
        updatePlayersList(players);
        updateWaitingPlayersList(players);
    });
    
    // Game starting
    socket.on('gameStarting', () => {
        // Stop all music when game starts
        stopAllMusic();
        switchScreen(gameScreen);
        showFeedback('Game Starting...', 'correct');
        
        // Initialize completed players display for host (create empty display)
        if (GameState.isHost) {
            updateCompletedPlayersDisplay([]);
        }
    });
    
    // New round with 3-second countdown
    socket.on('newRound', ({ round, totalRounds, firstLetter, lastLetter, timerDuration }) => {
        // Use the new countdown function
        startRoundWithCountdown(round, totalRounds, firstLetter, lastLetter, timerDuration);
    });
    
    // Check word validity
    socket.on('checkWord', async ({ answer, timestamp }) => {
        const isValid = await isValidWord(answer);
        // Use the exact timestamp provided by the server for accurate timing
        socket.emit('wordValidated', {
            roomCode: GameState.roomCode,
            answer,
            isValid,
            remainingTime: null, // Let server calculate based on timestamp
            timestamp
        });
    });
    
    // Invalid answer
    socket.on('invalidAnswer', ({ message }) => {
        // No sound for clients - host handles all audio
        showFeedback(message, 'incorrect');
    });
    
    // Invalid word - allow retry
    socket.on('invalidWord', ({ message }) => {
        // No sound for clients - host handles all audio
        showFeedback(message, 'incorrect');
        // Input should always stay enabled, just clear it and re-enable submit
        submitAnswerBtn.disabled = false;
        answerInput.value = '';
        // Keep focus to maintain keyboard
        answerInput.focus();
    });
    
    // Already answered
    socket.on('alreadyAnswered', () => {
        showFeedback('You already answered this round!', 'incorrect');
    });
    
    // Correct answer confirmation
    socket.on('correctAnswer', ({ word, points, basePoints, multiplier, remainingTime }) => {
        let message = `✅ Correct! "${word.toUpperCase()}"`;
        if (multiplier > 1) {
            message += ` x${multiplier} bonus! +${points} points`;
        } else {
            message += ` +${points} points`;
        }
        showFeedback(message, 'correct');
    });
    
    // Score update
    socket.on('scoreUpdate', ({ scores }) => {
        updateScoreboard(scores);
    });
    
    // Round complete (with all correct answers)
    socket.on('roundComplete', ({ correctAnswers }) => {
        // Clear ALL timers and intervals
        if (GameState.timerInterval) {
            clearInterval(GameState.timerInterval);
            GameState.timerInterval = null;
        }
        if (GameState.countdownInterval) {
            clearInterval(GameState.countdownInterval);
            GameState.countdownInterval = null;
        }
        stopAllMusic();
        
        answerInput.disabled = true;
        submitAnswerBtn.disabled = true;
        
        // Show all correct answers
        if (correctAnswers.length > 0) {
            const answersText = correctAnswers.map(a => `${a.player}: "${a.word.toUpperCase()}" (${a.points}pts)`).join(', ');
            roundWinner.textContent = `✅ Correct answers: ${answersText}`;
        }
        
        // Start background music after a delay
        startBackgroundMusic();
    });
    
    // Round timeout
    socket.on('roundTimeout', ({ exampleWord }) => {
        // Clear ALL timers and intervals
        if (GameState.timerInterval) {
            clearInterval(GameState.timerInterval);
            GameState.timerInterval = null;
        }
        if (GameState.countdownInterval) {
            clearInterval(GameState.countdownInterval);
            GameState.countdownInterval = null;
        }
        stopAllMusic();
        
        answerInput.disabled = true;
        submitAnswerBtn.disabled = true;
        
        // Play timeout sound for ALL players
        if (Sounds.incorrect) {
            Sounds.incorrect.play().catch(() => {});
        }
        
        if (exampleWord) {
            showFeedback(`⏰ Time's up! Nobody got it. Example word: "${exampleWord.toUpperCase()}"`, 'incorrect');
            roundWinner.textContent = `An example word was: ${exampleWord.toUpperCase()}`;
        } else {
            showFeedback('⏰ Time\'s up! No one got it this round.', 'incorrect');
        }
        
        // Start background music after a delay
        startBackgroundMusic();
    });
    
    // Mid-game summary
    socket.on('midGameSummary', ({ scores, currentRound, totalRounds }) => {
        midGameRound.textContent = currentRound;
        midGameTotal.textContent = totalRounds;
        
        displayMidGameRankings(scores);
        switchScreen(midGameScreen);
        
        // Automatically return to game screen after showing summary
        setTimeout(() => {
            switchScreen(gameScreen);
        }, 8000); // Match server's 8-second delay
    });
    
    // Waiting for host to continue
    socket.on('waitingForHost', ({ message }) => {
        if (!GameState.isHost) {
            showFeedback(message, 'correct');
        }
    });
    
    // Show continue button (host only)
    socket.on('showContinueButton', ({ currentRound, totalRounds }) => {
        if (GameState.isHost) {
            showContinueButton(currentRound, totalRounds);
        }
    });
    
    // Player completed (host only - real-time updates)
    socket.on('playerCompleted', ({ playerName, word, allCompletedPlayers }) => {
        if (GameState.isHost) {
            updateCompletedPlayersDisplay(allCompletedPlayers);
            
            // Check if all players have completed (excluding host)
            const activePlayers = GameState.players.filter(p => !p.isHost);
            if (allCompletedPlayers.length >= activePlayers.length && activePlayers.length > 0) {
                // All players completed - notify server to end round early
                socket.emit('allPlayersCompleted', { roomCode: GameState.roomCode });
            }
        }
    });
    
    // All players completed - round ended early
    socket.on('roundEndedEarly', ({ correctAnswers }) => {
        // Clear ALL timers and intervals
        if (GameState.timerInterval) {
            clearInterval(GameState.timerInterval);
            GameState.timerInterval = null;
        }
        if (GameState.countdownInterval) {
            clearInterval(GameState.countdownInterval);
            GameState.countdownInterval = null;
        }
        if (GameState.animationFrame) {
            cancelAnimationFrame(GameState.animationFrame);
            GameState.animationFrame = null;
        }
        stopAllMusic();
        
        answerInput.disabled = true;
        submitAnswerBtn.disabled = true;
        
        // Show completion message
        if (correctAnswers.length > 0) {
            const answersText = correctAnswers.map(a => `${a.player}: "${a.word.toUpperCase()}" (${a.points}pts)`).join(', ');
            roundWinner.textContent = `🎉 All players completed! ${answersText}`;
        }
        
        showFeedback('🎉 All players completed the round!', 'correct');
    });
    
    // Game over
    socket.on('gameOver', ({ scores, winner }) => {
        clearInterval(GameState.timerInterval);
        
        // Ensure all music is stopped before playing end game music
        stopAllMusic();
        
        // Play end game music for leaderboard (playMusic already calls stopAllMusic)
        playMusic(Music.endGame, true);
        
        displayFinalScores(scores);
        winnerNameEl.textContent = winner.name;
        
        switchScreen(endScreen);
    });
}

// Create room
function createRoom() {
    socket.emit('createRoom');
}

// Join room
function joinRoom() {
    const roomCode = Array.from(codeDigitInputs).map(input => input.value).join('');
    const playerName = playerNameInput.value.trim();
    
    if (roomCode.length !== 4) {
        alert('Please enter a 4-letter room code');
        return;
    }
    
    if (!playerName) {
        alert('Please enter your name');
        return;
    }
    
    socket.emit('joinRoom', { roomCode, playerName });
}

// Start game (host only)
function startGame() {
    socket.emit('startGame', { 
        roomCode: GameState.roomCode,
        timerDuration: GameState.selectedTimer 
    });
}

// Submit answer
function submitAnswer() {
    const answer = answerInput.value.trim();
    
    if (!answer) {
        alert('Please enter a word');
        return;
    }
    
    // Only disable submit button temporarily, keep input enabled for better UX
    submitAnswerBtn.disabled = true;
    
    socket.emit('submitAnswer', {
        roomCode: GameState.roomCode,
        answer,
        timestamp: Date.now()
    });
}

// Start timer
function startTimer(duration) {
    console.log(`Starting timer for ${duration} seconds`);
    
    // Clear any existing timer first to prevent overlaps
    if (GameState.timerInterval) {
        clearInterval(GameState.timerInterval);
        GameState.timerInterval = null;
    }
    
    // Reset timer state completely
    GameState.timeLeft = duration;
    timerText.textContent = GameState.timeLeft;
    timerCircle.classList.remove('warning');
    
    // Reset timer circle to full (start from 0 offset for a full circle)
    const circumference = 283;
    timerCircle.style.strokeDashoffset = 0;
    
    // Play random countdown music for this round (for ALL players)
    // Stop all existing music first to prevent overlap
    stopAllMusic();
    
    Music.currentCountdown = getRandomCountdownMusic(duration);
    Music.currentCountdown.currentTime = 0;
    Music.currentCountdown.volume = 0.35;
    Music.currentCountdown.play().catch(e => console.log('Countdown music failed:', e));
    
    // Use a more reliable timer approach with high precision
    const startTime = performance.now();
    const durationMs = duration * 1000;
    
    // Clear any existing animation frame
    if (GameState.animationFrame) {
        cancelAnimationFrame(GameState.animationFrame);
    }
    
    function updateTimer() {
        const elapsed = performance.now() - startTime;
        const remaining = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));
        
        GameState.timeLeft = remaining;
        timerText.textContent = remaining;
        
        // Calculate offset for remaining time (circle empties as time runs out)
        const progress = Math.min(1, elapsed / durationMs);
        const offset = circumference * progress;
        timerCircle.style.strokeDashoffset = offset;
        
        if (remaining <= 10 && remaining > 0) {
            timerCircle.classList.add('warning');
        }
        
        // Continue updating unless timer is complete
        if (elapsed < durationMs) {
            GameState.animationFrame = requestAnimationFrame(updateTimer);
        } else {
            console.log('Client timer reached 0, waiting for server...');
        }
    }
    
    // Start the animation loop
    GameState.animationFrame = requestAnimationFrame(updateTimer);
}

// Update players list (host view)
function updatePlayersList(players) {
    lobbyPlayersList.innerHTML = '';
    players.forEach(player => {
        const tag = document.createElement('div');
        tag.className = 'player-tag';
        tag.textContent = player.name;
        lobbyPlayersList.appendChild(tag);
    });
}

// Update waiting players list (player view)
function updateWaitingPlayersList(players) {
    waitingPlayersList.innerHTML = '';
    players.forEach(player => {
        const tag = document.createElement('div');
        tag.className = 'player-tag';
        tag.textContent = player.name;
        waitingPlayersList.appendChild(tag);
    });
}

// Update scoreboard (only visible to host)
function updateScoreboard(scores) {
    // Only show scoreboard to host during game
    if (!GameState.isHost) {
        // Hide scoreboard for clients
        const scoreboard = document.querySelector('.scoreboard');
        if (scoreboard) {
            scoreboard.style.display = 'none';
        }
        return;
    }
    
    scoreboardList.innerHTML = '';
    // Sort by HIGHEST score (highest points wins!)
    const sortedScores = [...scores].sort((a, b) => b.score - a.score);
    
    sortedScores.forEach((player, index) => {
        const item = document.createElement('div');
        item.className = index === 0 ? 'score-item leader' : 'score-item';
        item.innerHTML = `
            <span class="score-name">${index + 1}. ${player.name}</span>
            <span class="score-points">${player.score} pts</span>
        `;
        scoreboardList.appendChild(item);
    });
    
    // Make sure scoreboard is visible for host
    const scoreboard = document.querySelector('.scoreboard');
    if (scoreboard) {
        scoreboard.style.display = 'block';
    }
}

// Display mid-game rankings (Kahoot-style)
function displayMidGameRankings(scores) {
    midGameRankings.innerHTML = '';
    
    scores.forEach((player, index) => {
        const item = document.createElement('div');
        item.className = 'midgame-rank-item';
        
        // Add special classes for top 3
        if (index === 0) item.classList.add('first');
        else if (index === 1) item.classList.add('second');
        else if (index === 2) item.classList.add('third');
        
            item.innerHTML = `
            <div class="rank-info">
                <div class="rank-number">${player.rank}</div>
                <span class="rank-name">${player.name}</span>
            </div>
            <div class="rank-score">${player.score}</div>
        `;
        
        midGameRankings.appendChild(item);
    });
}

// Display final scores
function displayFinalScores(scores) {
    finalScoresList.innerHTML = '';
    scores.forEach((player, index) => {
        const item = document.createElement('div');
        item.className = index === 0 ? 'score-item leader' : 'score-item';
        item.innerHTML = `
            <span class="score-name">${index + 1}. ${player.name}</span>
            <span class="score-points">${player.score} pts total</span>
        `;
        finalScoresList.appendChild(item);
    });
}

// Show feedback message
function showFeedback(message, type) {
    feedbackMessage.textContent = message;
    feedbackMessage.className = `feedback-message ${type}`;
}

// Show continue button for host
function showContinueButton(currentRound, totalRounds) {
    const continueBtn = document.createElement('button');
    continueBtn.className = 'btn btn-success btn-large continue-btn';
    continueBtn.textContent = currentRound >= totalRounds ? 'Show Final Results' : 'Start Next Round';
    continueBtn.style.position = 'fixed';
    continueBtn.style.bottom = '20px';
    continueBtn.style.left = '50%';
    continueBtn.style.transform = 'translateX(-50%)';
    continueBtn.style.zIndex = '1000';
    
    // Remove any existing continue button
    const existingBtn = document.querySelector('.continue-btn');
    if (existingBtn) existingBtn.remove();
    
    continueBtn.addEventListener('click', () => {
        socket.emit('continueToNextRound', { roomCode: GameState.roomCode });
        continueBtn.remove();
    });
    
    document.body.appendChild(continueBtn);
}

// Update completed players display (host only)
function updateCompletedPlayersDisplay(completedPlayers) {
    if (!GameState.isHost) return;
    
    // Get or create the completed players container
    let completedContainer = document.getElementById('completedPlayersContainer');
    if (!completedContainer) {
        completedContainer = document.createElement('div');
        completedContainer.id = 'completedPlayersContainer';
        completedContainer.className = 'completed-players-display';
        completedContainer.innerHTML = `
            <div class="completed-header">Players Completed:</div>
            <div class="completed-list" id="completedPlayersList"></div>
        `;
        
        // Insert between game header and challenge container for better visibility
        const gameHeader = document.querySelector('.game-header');
        const challengeContainer = document.querySelector('.challenge-container');
        
        if (gameHeader && challengeContainer) {
            // Insert right after the game header
            gameHeader.parentElement.insertBefore(completedContainer, challengeContainer);
            console.log('Completed players container inserted between header and challenge');
        } else {
            // Fallback: add to top of game screen
            const gameScreen = document.getElementById('gameScreen');
            if (gameScreen) {
                gameScreen.insertBefore(completedContainer, gameScreen.firstChild);
                console.log('Completed players container added to top of game screen');
            }
        }
        
        // Add CSS styles for individual player badges
        const style = document.createElement('style');
        style.textContent = `
            .completed-players-display {
                padding: 15px 25px;
                margin: 10px auto;
                text-align: center;
                max-width: 600px;
                width: 90%;
                position: relative;
                z-index: 10;
                animation: slideInDown 0.3s ease-out;
            }
            
            @keyframes slideInDown {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            @keyframes popIn {
                0% {
                    opacity: 0;
                    transform: scale(0.5);
                }
                50% {
                    transform: scale(1.1);
                }
                100% {
                    opacity: 1;
                    transform: scale(1);
                }
            }
            
            .completed-header {
                font-weight: bold;
                font-size: 18px;
                margin-bottom: 12px;
                color: #333;
                text-shadow: none;
            }
            
            .completed-list {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                justify-content: center;
                align-items: center;
                min-height: 40px;
            }
            
            .player-badge {
                background: linear-gradient(135deg, #4CAF50, #45a049);
                color: white;
                padding: 8px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                animation: popIn 0.4s ease-out;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                border: 2px solid white;
                min-width: 80px;
            }
            
            .player-badge:nth-child(1) { background: linear-gradient(135deg, #FF6B6B, #FF5252); }
            .player-badge:nth-child(2) { background: linear-gradient(135deg, #4ECDC4, #26A69A); }
            .player-badge:nth-child(3) { background: linear-gradient(135deg, #45B7D1, #2196F3); }
            .player-badge:nth-child(4) { background: linear-gradient(135deg, #96CEB4, #4CAF50); }
            .player-badge:nth-child(5) { background: linear-gradient(135deg, #FECA57, #FF9800); }
            .player-badge:nth-child(6) { background: linear-gradient(135deg, #A29BFE, #6C5CE7); }
            .player-badge:nth-child(7) { background: linear-gradient(135deg, #FD79A8, #E91E63); }
            .player-badge:nth-child(8) { background: linear-gradient(135deg, #FDCB6E, #F39C12); }
            
            .no-players-message {
                color: #666;
                font-style: italic;
                font-size: 14px;
                padding: 10px;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Update content with individual player badges
    const completedList = document.getElementById('completedPlayersList');
    if (completedList) {
        if (completedPlayers.length === 0) {
            completedList.innerHTML = '<div class="no-players-message">None yet...</div>';
        } else {
            // Create individual badges for each player with multiplier
            const badges = completedPlayers.map(player => {
                const displayName = typeof player === 'string' ? player : player.name;
                const multiplier = typeof player === 'object' ? player.multiplier : 1;
                const multiplierText = multiplier > 1 ? ` x${multiplier}!` : '';
                return `<div class="player-badge">${displayName}${multiplierText}</div>`;
            }).join('');
            completedList.innerHTML = badges;
        }
    }
    
    // Make sure it's visible
    if (completedContainer) {
        completedContainer.style.display = 'block';
    }
}

// Clear completed players display (host only)
function clearCompletedPlayersDisplay() {
    if (!GameState.isHost) return;
    
    const completedList = document.getElementById('completedPlayersList');
    if (completedList) {
        completedList.textContent = 'None';
    }
}

// Switch screens
function switchScreen(screen) {
    hostScreen.classList.remove('active');
    roomCodeScreen.classList.remove('active');
    joinScreen.classList.remove('active');
    waitingScreen.classList.remove('active');
    gameScreen.classList.remove('active');
    midGameScreen.classList.remove('active');
    endScreen.classList.remove('active');
    
    screen.classList.add('active');
}

// Check for room code in URL
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const joinCode = urlParams.get('join');
    
    if (joinCode) {
        // Auto-fill room code from QR scan
        const digits = joinCode.split('');
        codeDigitInputs.forEach((input, index) => {
            if (digits[index]) {
                input.value = digits[index];
            }
        });
        switchScreen(joinScreen);
        playerNameInput.focus();
    }
});

// ========================================
// FEEDBACK SYSTEM
// ========================================

// Feedback system state
const FeedbackState = {
    currentRating: 0,
    currentType: 'suggestion',
    isSubmitting: false
};

// Initialize feedback system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeFeedbackSystem();
});

function initializeFeedbackSystem() {
    // Get feedback elements
    const feedbackBtn = document.getElementById('feedbackBtn');
    const feedbackModal = document.getElementById('feedbackModal');
    const feedbackSuccess = document.getElementById('feedbackSuccess');
    const closeFeedbackBtn = document.getElementById('closeFeedbackBtn');
    const cancelFeedbackBtn = document.getElementById('cancelFeedbackBtn');
    const submitFeedbackBtn = document.getElementById('submitFeedbackBtn');
    
    // Get form elements
    const feedbackTypeButtons = document.querySelectorAll('.feedback-type-btn');
    const stars = document.querySelectorAll('.star');
    const feedbackText = document.getElementById('feedbackText');
    const feedbackEmail = document.getElementById('feedbackEmail');
    
    if (!feedbackBtn) return; // Exit if feedback system not available
    
    // Event Listeners
    feedbackBtn.addEventListener('click', openFeedbackModal);
    closeFeedbackBtn.addEventListener('click', closeFeedbackModal);
    cancelFeedbackBtn.addEventListener('click', closeFeedbackModal);
    submitFeedbackBtn.addEventListener('click', submitFeedback);
    
    // Close modal when clicking outside
    feedbackModal.addEventListener('click', (e) => {
        if (e.target === feedbackModal) {
            closeFeedbackModal();
        }
    });
    
    // Close with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && feedbackModal.classList.contains('active')) {
            closeFeedbackModal();
        }
    });
    
    // Feedback type selection
    feedbackTypeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            feedbackTypeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            FeedbackState.currentType = btn.dataset.type;
        });
    });
    
    // Star rating system
    stars.forEach((star, index) => {
        const rating = index + 1;
        
        star.addEventListener('click', () => {
            FeedbackState.currentRating = rating;
            updateStarDisplay(rating);
        });
        
        star.addEventListener('mouseenter', () => {
            if (!FeedbackState.isSubmitting) {
                updateStarDisplay(rating);
            }
        });
    });
    
    // Reset stars on mouse leave
    const starRating = document.querySelector('.star-rating');
    if (starRating) {
        starRating.addEventListener('mouseleave', () => {
            if (!FeedbackState.isSubmitting) {
                updateStarDisplay(FeedbackState.currentRating);
            }
        });
    }
    
    // Auto-resize textarea
    if (feedbackText) {
        feedbackText.addEventListener('input', () => {
            autoResizeTextarea(feedbackText);
        });
    }
    
    // Enable/disable submit button based on content
    if (feedbackText) {
        feedbackText.addEventListener('input', validateFeedbackForm);
    }
}

function openFeedbackModal() {
    const feedbackModal = document.getElementById('feedbackModal');
    if (feedbackModal) {
        feedbackModal.classList.add('active');
        
        // Focus on the textarea
        const feedbackText = document.getElementById('feedbackText');
        if (feedbackText) {
            setTimeout(() => {
                feedbackText.focus();
            }, 300); // Small delay for animation
        }
        
        // Reset form
        resetFeedbackForm();
    }
}

function closeFeedbackModal() {
    const feedbackModal = document.getElementById('feedbackModal');
    if (feedbackModal) {
        feedbackModal.classList.remove('active');
    }
}

function resetFeedbackForm() {
    // Reset type to suggestion
    const feedbackTypeButtons = document.querySelectorAll('.feedback-type-btn');
    feedbackTypeButtons.forEach(btn => btn.classList.remove('active'));
    const suggestionBtn = document.querySelector('[data-type="suggestion"]');
    if (suggestionBtn) suggestionBtn.classList.add('active');
    FeedbackState.currentType = 'suggestion';
    
    // Reset rating
    FeedbackState.currentRating = 0;
    updateStarDisplay(0);
    
    // Clear text
    const feedbackText = document.getElementById('feedbackText');
    const feedbackEmail = document.getElementById('feedbackEmail');
    if (feedbackText) feedbackText.value = '';
    if (feedbackEmail) feedbackEmail.value = '';
    
    // Reset submit button
    const submitBtn = document.getElementById('submitFeedbackBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Send Feedback';
    }
    
    FeedbackState.isSubmitting = false;
}

function updateStarDisplay(rating) {
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

function validateFeedbackForm() {
    const feedbackText = document.getElementById('feedbackText');
    const submitBtn = document.getElementById('submitFeedbackBtn');
    
    if (feedbackText && submitBtn) {
        const hasText = feedbackText.value.trim().length > 0;
        submitBtn.disabled = !hasText || FeedbackState.isSubmitting;
    }
}

function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

async function submitFeedback() {
    if (FeedbackState.isSubmitting) return;
    
    const feedbackText = document.getElementById('feedbackText');
    const feedbackEmail = document.getElementById('feedbackEmail');
    const submitBtn = document.getElementById('submitFeedbackBtn');
    
    if (!feedbackText || !feedbackText.value.trim()) {
        alert('Please enter your feedback message.');
        return;
    }
    
    // Prepare feedback data
    const feedbackData = {
        type: FeedbackState.currentType,
        rating: FeedbackState.currentRating,
        message: feedbackText.value.trim(),
        email: feedbackEmail ? feedbackEmail.value.trim() : '',
        timestamp: new Date().toISOString(),
        roomCode: GameState.roomCode || 'none',
        playerName: GameState.playerName || 'anonymous',
        isHost: GameState.isHost || false,
        userAgent: navigator.userAgent,
        url: window.location.href
    };
    
    // Update UI to show submitting state
    FeedbackState.isSubmitting = true;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
    }
    
    try {
        // Send feedback to server
        const response = await fetch('/api/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(feedbackData)
        });
        
        if (response.ok) {
            // Show success message
            showFeedbackSuccess();
            closeFeedbackModal();
        } else {
            throw new Error(`Server error: ${response.status}`);
        }
    } catch (error) {
        console.error('Failed to submit feedback:', error);
        
        // Fallback: try to send via Socket.IO if available
        if (typeof socket !== 'undefined' && socket.connected) {
            try {
                socket.emit('submitFeedback', feedbackData);
                showFeedbackSuccess();
                closeFeedbackModal();
            } catch (socketError) {
                console.error('Socket.IO feedback submission failed:', socketError);
                showFeedbackError();
            }
        } else {
            showFeedbackError();
        }
    } finally {
        // Reset submitting state
        FeedbackState.isSubmitting = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Feedback';
        }
    }
}

function showFeedbackSuccess() {
    const feedbackSuccess = document.getElementById('feedbackSuccess');
    if (feedbackSuccess) {
        feedbackSuccess.classList.add('active');
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            feedbackSuccess.classList.remove('active');
        }, 3000);
    }
}

function showFeedbackError() {
    alert('Failed to send feedback. Please try again later or contact support directly.');
}

// Add feedback button pulse animation periodically
function startFeedbackButtonAnimation() {
    const feedbackBtn = document.getElementById('feedbackBtn');
    if (!feedbackBtn) return;
    
    // Add subtle pulse animation every 30 seconds
    setInterval(() => {
        feedbackBtn.style.animation = 'pulse 2s ease-in-out';
        setTimeout(() => {
            feedbackBtn.style.animation = '';
        }, 2000);
    }, 30000);
}

// Add CSS for pulse animation
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);

// Start feedback button animation
setTimeout(startFeedbackButtonAnimation, 10000); // Start after 10 seconds

// ========================================
// GAME MECHANICS MODAL
// ========================================

function openMechanicsModal() {
    const mechanicsModal = document.getElementById('mechanicsModal');
    if (mechanicsModal) {
        mechanicsModal.classList.add('active');
    }
}

function closeMechanicsModal() {
    const mechanicsModal = document.getElementById('mechanicsModal');
    if (mechanicsModal) {
        mechanicsModal.classList.remove('active');
    }
}

// Initialize mechanics modal when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeMechanicsModal();
});

function initializeMechanicsModal() {
    const closeMechanicsBtn = document.getElementById('closeMechanicsBtn');
    const gotItBtn = document.getElementById('gotItBtn');
    const mechanicsModal = document.getElementById('mechanicsModal');
    
    if (!mechanicsModal) return; // Exit if modal not available
    
    // Event Listeners
    if (closeMechanicsBtn) {
        closeMechanicsBtn.addEventListener('click', closeMechanicsModal);
    }
    
    if (gotItBtn) {
        gotItBtn.addEventListener('click', closeMechanicsModal);
    }
    
    // Close modal when clicking outside
    mechanicsModal.addEventListener('click', (e) => {
        if (e.target === mechanicsModal) {
            closeMechanicsModal();
        }
    });
    
    // Close with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mechanicsModal.classList.contains('active')) {
            closeMechanicsModal();
        }
    });
}

// ========================================
// HOMEPAGE BACKGROUND MUSIC
// ========================================

function startHomepageMusic() {
    // Wait a bit to ensure audio is initialized
    setTimeout(() => {
        // Only start if we're on the homepage and no room has been created
        if (hostScreen && hostScreen.classList.contains('active') && !GameState.roomCode) {
            console.log('Starting homepage background music...');
            try {
                // Use a soft ambient version of lobby music for homepage
                if (Music.lobby && Music.initialized) {
                    Music.lobby.volume = 0.15; // Lower volume for homepage
                    Music.lobby.loop = true;
                    Music.lobby.play().catch(e => {
                        console.log('Homepage music autoplay blocked:', e);
                        // Add a subtle hint for user interaction to enable audio
                        addAudioInteractionHint();
                    });
                    Music.currentBgMusic = Music.lobby;
                }
            } catch (error) {
                console.warn('Homepage music failed to start:', error);
            }
        }
    }, 1000);
}

function addAudioInteractionHint() {
    // Check if hint already exists
    if (document.getElementById('audioHint')) return;
    
    const hint = document.createElement('div');
    hint.id = 'audioHint';
    hint.innerHTML = '🎵 Click anywhere to enable audio';
    hint.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(102, 126, 234, 0.9);
        color: white;
        padding: 10px 20px;
        border-radius: 25px;
        font-size: 14px;
        font-weight: 600;
        z-index: 1000;
        animation: fadeInOut 3s ease-in-out;
        pointer-events: none;
    `;
    
    // Add fade animation
    const hintStyle = document.createElement('style');
    hintStyle.textContent = `
        @keyframes fadeInOut {
            0%, 100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
            20%, 80% { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
    `;
    document.head.appendChild(hintStyle);
    
    document.body.appendChild(hint);
    
    // Remove hint after animation
    setTimeout(() => {
        if (hint.parentNode) {
            hint.parentNode.removeChild(hint);
        }
        if (hintStyle.parentNode) {
            hintStyle.parentNode.removeChild(hintStyle);
        }
    }, 3000);
    
    // Enable audio on first user interaction
    function enableAudio() {
        if (Music.lobby && hostScreen.classList.contains('active')) {
            Music.lobby.volume = 0.15;
            Music.lobby.play().catch(() => {});
            Music.currentBgMusic = Music.lobby;
        }
        
        // Remove the hint immediately on interaction
        if (hint.parentNode) {
            hint.parentNode.removeChild(hint);
        }
        
        // Remove listeners
        document.removeEventListener('click', enableAudio);
        document.removeEventListener('keydown', enableAudio);
        document.removeEventListener('touchstart', enableAudio);
    }
    
    // Listen for any user interaction
    document.addEventListener('click', enableAudio);
    document.addEventListener('keydown', enableAudio);
    document.addEventListener('touchstart', enableAudio);
}


// ========================================
// 3-SECOND COUNTDOWN BEFORE ROUNDS
// ========================================

// Updated newRound socket listener to include 3-second countdown
function startRoundWithCountdown(round, totalRounds, firstLetter, lastLetter, timerDuration) {
    GameState.currentRound = round;
    GameState.currentChallenge = { firstLetter, lastLetter };
    
    // Clear ALL existing timers first to prevent overlaps
    if (GameState.timerInterval) {
        clearInterval(GameState.timerInterval);
        GameState.timerInterval = null;
    }
    if (GameState.countdownInterval) {
        clearInterval(GameState.countdownInterval);
        GameState.countdownInterval = null;
    }
    if (GameState.animationFrame) {
        cancelAnimationFrame(GameState.animationFrame);
        GameState.animationInterval = null;
    }
    
    // Store the DISPLAY timer duration (what players see)
    GameState.selectedTimer = timerDuration;
    
    currentRoundEl.textContent = round;
    firstLetterEl.textContent = '?';
    lastLetterEl.textContent = '?';
    startLetter.textContent = '?';
    endLetter.textContent = '?';
    
    // Clear completed players display for new round (host only)
    if (GameState.isHost) {
        clearCompletedPlayersDisplay();
    }
    
    // Hide input area for all players during countdown
    const answerInputGroup = document.querySelector('.answer-input-group');
    answerInputGroup.style.display = 'none';
    
    feedbackMessage.textContent = '';
    feedbackMessage.className = 'feedback-message';
    roundWinner.textContent = '';
    
    // Start 3-second countdown
    showRoundCountdown(() => {
        // After countdown, reveal letters and start the actual round
        firstLetterEl.textContent = firstLetter;
        lastLetterEl.textContent = lastLetter;
        startLetter.textContent = firstLetter;
        endLetter.textContent = lastLetter;
        
        // Show input area for clients only
        if (!GameState.isHost) {
            answerInputGroup.style.display = 'flex';
            answerInput.value = '';
            answerInput.disabled = false;
            submitAnswerBtn.disabled = false;
            answerInput.focus();
        }
        
        // Start the main timer with the FULL duration (so players get the full time they expect)
        // The countdown doesn't eat into their game time
        startTimer(timerDuration);
    });
}

function showRoundCountdown(onComplete) {
    let countdown = 3;
    
    // Clear any existing countdown interval first
    if (GameState.countdownInterval) {
        clearInterval(GameState.countdownInterval);
        GameState.countdownInterval = null;
    }
    
    // Play countdown start sound for ALL players - ensure audio is initialized
    if (Music.initialized && Music.countdownStart3s) {
        try {
            Music.countdownStart3s.currentTime = 0;
            Music.countdownStart3s.volume = 0.4;
            Music.countdownStart3s.play().catch(e => {
                console.log('Countdown start music failed:', e);
            });
            console.log('Playing 3-second countdown music');
        } catch (error) {
            console.log('Error playing countdown start music:', error);
        }
    } else {
        console.log('Music not initialized or countdownStart3s not available');
    }
    
    // Show countdown overlay
    const countdownOverlay = document.createElement('div');
    countdownOverlay.id = 'countdownOverlay';
    countdownOverlay.innerHTML = `
        <div class="countdown-content">
            <div class="countdown-number">${countdown}</div>
            <div class="countdown-text">Get Ready!</div>
        </div>
    `;
    countdownOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(102, 126, 234, 0.95);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 3000;
        font-family: 'Poppins', sans-serif;
    `;
    
    // Add countdown styles
    const countdownStyle = document.createElement('style');
    countdownStyle.id = 'countdownStyle';
    countdownStyle.textContent = `
        .countdown-content {
            text-align: center;
            animation: countdownBounce 0.5s ease-out;
        }
        
        .countdown-number {
            font-size: 8rem;
            font-weight: 800;
            margin-bottom: 20px;
            animation: countdownPulse 1s ease-in-out;
        }
        
        .countdown-text {
            font-size: 2rem;
            font-weight: 600;
            opacity: 0.9;
        }
        
        @keyframes countdownBounce {
            0% { opacity: 0; transform: scale(0.3); }
            50% { transform: scale(1.1); }
            100% { opacity: 1; transform: scale(1); }
        }
        
        @keyframes countdownPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.2); }
        }
        
        @media (max-width: 768px) {
            .countdown-number {
                font-size: 5rem;
            }
            .countdown-text {
                font-size: 1.5rem;
            }
        }
    `;
    document.head.appendChild(countdownStyle);
    document.body.appendChild(countdownOverlay);
    
    // Store countdown interval in GameState for proper cleanup
    GameState.countdownInterval = setInterval(() => {
        countdown--;
        
        if (countdown > 0) {
            // Update countdown display
            const countdownNumber = countdownOverlay.querySelector('.countdown-number');
            if (countdownNumber) {
                countdownNumber.textContent = countdown;
                
                // Restart animation
                countdownNumber.style.animation = 'none';
                countdownNumber.offsetHeight; // Trigger reflow
                countdownNumber.style.animation = 'countdownPulse 1s ease-in-out';
            }
            
            // Play tick sound for ALL players - ensure sound is available
            if (Music.initialized && Sounds.tick) {
                try {
                    Sounds.tick.play().catch(e => {
                        console.log('Tick sound failed:', e);
                    });
                } catch (error) {
                    console.log('Error playing tick sound:', error);
                }
            }
        } else {
            // Countdown finished
            clearInterval(GameState.countdownInterval);
            GameState.countdownInterval = null;
            
            // Show "GO!" for a brief moment
            const countdownNumber = countdownOverlay.querySelector('.countdown-number');
            const countdownText = countdownOverlay.querySelector('.countdown-text');
            if (countdownNumber && countdownText) {
                countdownNumber.textContent = 'GO!';
                countdownText.textContent = 'Find the word!';
                countdownNumber.style.color = '#28a745';
            }
            
            setTimeout(() => {
                // Remove countdown overlay
                if (countdownOverlay.parentNode) {
                    countdownOverlay.parentNode.removeChild(countdownOverlay);
                }
                if (countdownStyle.parentNode) {
                    countdownStyle.parentNode.removeChild(countdownStyle);
                }
                
                // Start the actual round
                onComplete();
            }, 800);
        }
    }, 1000);
}
