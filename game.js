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
    selectedTimer: 30  // Default 30 seconds
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
    initialized: false
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

// Helper function to play music (only for host)
function playMusic(audio, loop = false) {
    // Only play music/sounds for host, not for clients
    if (!GameState.isHost) return;
    
    stopAllMusic();
    if (audio) {
        audio.loop = loop;
        audio.currentTime = 0;
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
    // Only for host
    if (!GameState.isHost) return;
    
    // Don't start if music is already playing
    if (Music.currentBgMusic && !Music.currentBgMusic.paused) return;
    if (Music.currentCountdown && !Music.currentCountdown.paused) return;
    
    // Use lobby music as background
    setTimeout(() => {
        // Double-check no music is playing after delay
        if (GameState.isHost && (!Music.currentBgMusic || Music.currentBgMusic.paused) && 
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
    
    // Timer selection buttons
    document.querySelectorAll('.timer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.timer-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            GameState.selectedTimer = parseInt(btn.dataset.duration);
        });
    });
    
    // Auto-focus next digit input
    codeDigitInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            if (e.target.value.length === 1 && index < codeDigitInputs.length - 1) {
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
    socket.on('roomCreated', ({ roomCode, serverIP, serverPort }) => {
        GameState.roomCode = roomCode;
        GameState.isHost = true;
        
        displayRoomCode.textContent = roomCode;
        currentRoomCode.textContent = roomCode;
        
        // Generate QR code using server's network IP
        const url = `http://${serverIP}:${serverPort}?join=${roomCode}`;
        joinUrl.textContent = url;
        
        qrCode.innerHTML = '';
        new QRCode(qrCode, {
            text: url,
            width: 200,
            height: 200
        });
        
        // Play lobby music
        playMusic(Music.lobby, true);
        
        switchScreen(roomCodeScreen);
    });
    
    // Player joined
    socket.on('playerJoined', ({ players }) => {
        GameState.players = players;
        updatePlayersList(players);
        
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
    
    // New round with countdown (always 3 seconds for all rounds)
    socket.on('newRound', ({ round, totalRounds, firstLetter, lastLetter, timerDuration }) => {
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
            GameState.animationFrame = null;
        }
        
        // Store the timer duration for this round
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
        
        // Hide input area for host, show for clients
        const answerInputGroup = document.querySelector('.answer-input-group');
        if (GameState.isHost) {
            answerInputGroup.style.display = 'none';
        } else {
            answerInputGroup.style.display = 'flex';
            // Clear input value but keep it enabled and focused
            answerInput.value = '';
            answerInput.disabled = false;  // Keep enabled throughout
            submitAnswerBtn.disabled = true;  // Only disable submit until countdown ends
        }
        
        feedbackMessage.textContent = '';
        feedbackMessage.className = 'feedback-message';
        roundWinner.textContent = '';
        
        // No countdown - start immediately
        
        // Reveal letters and start game immediately
        firstLetterEl.textContent = firstLetter;
        lastLetterEl.textContent = lastLetter;
        startLetter.textContent = firstLetter;
        endLetter.textContent = lastLetter;
        
        // Enable submit button immediately for clients
        if (!GameState.isHost) {
            submitAnswerBtn.disabled = false;
            answerInput.focus();
        }
        
        // Start the main timer immediately
        startTimer(timerDuration);
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
        
        // Play timeout sound (only for host)
        if (GameState.isHost) {
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
        alert('Please enter a 4-digit room code');
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
    
    // Play random countdown music for this round (only for host)
    if (GameState.isHost) {
        // Stop all existing music first to prevent overlap
        stopAllMusic();
        
        Music.currentCountdown = getRandomCountdownMusic(duration);
        Music.currentCountdown.currentTime = 0;
        Music.currentCountdown.play().catch(e => console.log('Countdown music failed:', e));
    }
    
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
