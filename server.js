// WordWiz Multiplayer Game Server
// Node.js + Express + Socket.IO

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

// Get local IP address
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const LOCAL_IP = getLocalIP();

// Serve static files
app.use(express.static(__dirname));

// Game rooms storage
const gameRooms = new Map();

// Generate random 4-digit room code
function generateRoomCode() {
    let code;
    do {
        code = Math.floor(1000 + Math.random() * 9000).toString();
    } while (gameRooms.has(code));
    return code;
}

// Letter frequency weights based on English usage and word formation potential
const LETTER_WEIGHTS = {
    // High frequency - common letters with many word possibilities (weight 10)
    'A': 10, 'E': 10, 'I': 9, 'O': 9, 'S': 10, 'T': 10, 'N': 9, 'R': 9,
    // Medium-high frequency - fairly common (weight 7-8)
    'L': 8, 'D': 8, 'C': 7, 'H': 7, 'M': 7, 'U': 7, 'P': 7, 'G': 7,
    // Medium frequency - moderate usage (weight 5-6)
    'B': 6, 'F': 5, 'W': 5, 'Y': 5, 'V': 4,
    // Low frequency - challenging but still manageable (weight 2-3)
    'K': 3, 'J': 2, 'X': 2,
    // Very low frequency - very challenging (weight 1)
    'Q': 1, 'Z': 1
};

// Letters that work well as starting letters (more words begin with these)
const GOOD_START_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U', 'W'];

// Letters that work well as ending letters (more words end with these)
const GOOD_END_LETTERS = ['A', 'D', 'E', 'G', 'H', 'K', 'L', 'N', 'R', 'S', 'T', 'Y'];

// Weighted random selection function
function getWeightedRandomLetter(weights, favoredLetters = null) {
    const letters = Object.keys(weights);
    const weightedLetters = [];
    
    for (const letter of letters) {
        let weight = weights[letter];
        
        // Boost weight for favored letters (good start/end letters)
        if (favoredLetters && favoredLetters.includes(letter)) {
            weight = Math.min(weight * 1.5, 12); // Cap at 12 to avoid extreme bias
        }
        
        // Add letter multiple times based on weight
        for (let i = 0; i < weight; i++) {
            weightedLetters.push(letter);
        }
    }
    
    return weightedLetters[Math.floor(Math.random() * weightedLetters.length)];
}

// Get random letters for the challenge with weighted selection
function getRandomLetters() {
    // Get weighted random letters favoring good combinations
    const firstLetter = getWeightedRandomLetter(LETTER_WEIGHTS, GOOD_START_LETTERS);
    
    // For ending letters, exclude Q and favor good ending letters
    const endWeights = { ...LETTER_WEIGHTS };
    delete endWeights.Q; // Remove Q from ending possibilities
    const lastLetter = getWeightedRandomLetter(endWeights, GOOD_END_LETTERS);
    
    // Calculate difficulty bonus for scoring (if needed later)
    const getDifficultyLevel = (letter) => {
        const weight = LETTER_WEIGHTS[letter];
        if (weight >= 9) return 0; // Easy
        if (weight >= 7) return 1; // Medium
        if (weight >= 4) return 2; // Hard
        return 3; // Very hard
    };
    
    const difficultyBonus = getDifficultyLevel(firstLetter) + getDifficultyLevel(lastLetter);
    
    return { firstLetter, lastLetter, difficultyBonus };
}

// Common word database for examples
const EXAMPLE_WORDS = [
    "cat", "dog", "bat", "hat", "rat", "sun", "fun", "run", "pen", "car",
    "book", "cook", "look", "love", "move", "time", "game", "name", "hope", "fire",
    "happy", "table", "light", "night", "green", "beach", "brave", "party", "dream",
    "castle", "friend", "simple", "summer", "forest", "dragon", "master", "planet",
    "kitchen", "weather", "culture", "freedom", "perfect", "science", "history",
    "computer", "together", "birthday", "elephant", "surprise", "building", "mountain",
    "beautiful", "wonderful", "adventure", "knowledge", "celebrate", "community"
];

// Find an example word that matches the letters
function findExampleWord(firstLetter, lastLetter) {
    const matches = EXAMPLE_WORDS.filter(word =>
        word.charAt(0).toUpperCase() === firstLetter &&
        word.charAt(word.length - 1).toUpperCase() === lastLetter
    );
    return matches.length > 0 ? matches[Math.floor(Math.random() * matches.length)] : null;
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Create new game room
    socket.on('createRoom', () => {
        const roomCode = generateRoomCode();
        const room = {
            code: roomCode,
            host: socket.id,
            players: [],
            gameStarted: false,
            currentRound: 0,
            totalRounds: 10,
            currentChallenge: null,
            roundStartTime: null,
            roundAnswers: new Map(),
            timerDuration: 30  // Default 30 seconds
        };
        
        gameRooms.set(roomCode, room);
        socket.join(roomCode);
        
        // Get the actual server URL from request headers or environment
        const req = socket.request;
        const protocol = req.headers['x-forwarded-proto'] || (req.connection.encrypted ? 'https' : 'http');
        const host = req.headers['x-forwarded-host'] || req.headers.host || `${LOCAL_IP}:${PORT}`;
        const serverURL = `${protocol}://${host}`;
        
        console.log(`Room created: ${roomCode} by ${socket.id}`);
        console.log(`Server URL: ${serverURL}`);
        
        socket.emit('roomCreated', { 
            roomCode, 
            serverURL,
            serverIP: LOCAL_IP, 
            serverPort: PORT 
        });
    });

    // Join existing room
    socket.on('joinRoom', ({ roomCode, playerName }) => {
        const room = gameRooms.get(roomCode);
        
        if (!room) {
            socket.emit('joinError', { message: 'Room not found' });
            return;
        }
        
        if (room.gameStarted) {
            socket.emit('joinError', { message: 'Game already in progress' });
            return;
        }
        
        // Check if player name already exists
        if (room.players.some(p => p.name === playerName)) {
            socket.emit('joinError', { message: 'Name already taken' });
            return;
        }
        
        const player = {
            id: socket.id,
            name: playerName,
            score: 0
        };
        
        room.players.push(player);
        socket.join(roomCode);
        
        console.log(`${playerName} joined room ${roomCode}`);
        
        // Notify player they joined successfully
        socket.emit('joinedRoom', { roomCode, playerName, players: room.players });
        
        // Notify all players in room about new player
        io.to(roomCode).emit('playerJoined', { players: room.players });
    });

    // Start game
    socket.on('startGame', ({ roomCode, timerDuration }) => {
        const room = gameRooms.get(roomCode);
        
        if (!room || room.host !== socket.id) {
            socket.emit('error', { message: 'Not authorized to start game' });
            return;
        }
        
        if (room.players.length < 2) {
            socket.emit('error', { message: 'Need at least 2 players' });
            return;
        }
        
        room.gameStarted = true;
        room.currentRound = 1;
        room.timerDuration = timerDuration || 30;  // Set timer duration
        
        console.log(`Game started in room ${roomCode} with ${room.timerDuration}s timer`);
        
        // Notify all players game is starting
        io.to(roomCode).emit('gameStarting');
        
        // Start first round after 3 seconds
        setTimeout(() => {
            startNewRound(roomCode);
        }, 3000);
    });

    // Submit answer
    socket.on('submitAnswer', ({ roomCode, answer, timestamp }) => {
        const room = gameRooms.get(roomCode);
        
        if (!room || !room.gameStarted) return;
        
        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;
        
        // Check if player already has a CORRECT answer this round
        const existingAnswer = room.roundAnswers.get(socket.id);
        if (existingAnswer && existingAnswer.correct) {
            socket.emit('alreadyAnswered');
            return;
        }
        
        // Validate answer (check if it starts and ends with correct letters)
        const normalizedAnswer = answer.toLowerCase().trim();
        const { firstLetter, lastLetter } = room.currentChallenge;
        
        const startsCorrect = normalizedAnswer.charAt(0).toUpperCase() === firstLetter;
        const endsCorrect = normalizedAnswer.charAt(normalizedAnswer.length - 1).toUpperCase() === lastLetter;
        const validLength = normalizedAnswer.length >= 3;
        
        if (startsCorrect && endsCorrect && validLength) {
            // This will be validated against word database on client
            socket.emit('checkWord', { answer: normalizedAnswer, timestamp });
        } else {
            // Don't store invalid format answers, just send error
            socket.emit('invalidAnswer', { 
                message: 'Word must start and end with the correct letters' 
            });
        }
    });

    // Word validated on client side
    socket.on('wordValidated', ({ roomCode, answer, isValid, remainingTime, timestamp }) => {
        const room = gameRooms.get(roomCode);
        if (!room || !room.gameStarted) return;
        
        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;
        
        // Check if round is still active
        if (!room.currentChallenge) return;
        
        // Check again if player already has a CORRECT answer
        const existingAnswer = room.roundAnswers.get(socket.id);
        if (existingAnswer && existingAnswer.correct) {
            socket.emit('alreadyAnswered');
            return;
        }
        
        if (isValid) {
            // Calculate word length multiplier
            const wordLength = answer.length;
            let multiplier = 1;
            if (wordLength >= 10) {
                multiplier = 4;
            } else if (wordLength >= 8) {
                multiplier = 3;
            } else if (wordLength >= 5) {
                multiplier = 2;
            }
            
            // Store the correct answer with proper timestamp
            const answerTime = timestamp || Date.now();
            const roundStartTime = room.roundStartTime || Date.now();
            const actualRemainingTime = Math.max(0, (room.timerDuration * 1000) - (answerTime - roundStartTime));
            
            room.roundAnswers.set(socket.id, {
                player,
                answer: answer,
                timestamp: answerTime,
                correct: true,
                remainingTime: actualRemainingTime,
                multiplier: multiplier,
                wordLength: wordLength
            });
            
            // Calculate score based on actual remaining time and multiplier
            // Max base score = 1000, proportional to remaining time, then apply multiplier
            const remainingSeconds = actualRemainingTime / 1000;
            const maxScore = 1000;
            const basePoints = Math.max(1, Math.round((remainingSeconds / room.timerDuration) * maxScore));
            const finalPoints = basePoints * multiplier;
            
            player.score += finalPoints;
            
            // Notify player about their correct answer and score
            socket.emit('correctAnswer', {
                word: answer,
                points: finalPoints,
                basePoints: basePoints,
                multiplier: multiplier,
                remainingTime: actualRemainingTime
            });
            
            // Update all players with current scores
            io.to(roomCode).emit('scoreUpdate', {
                scores: room.players.map(p => ({ name: p.name, score: p.score }))
            });
            
            // Notify host about player completion (real-time) with multiplier info
            const completedPlayers = Array.from(room.roundAnswers.values())
                .filter(a => a.correct)
                .map(a => ({
                    name: a.player.name,
                    multiplier: a.multiplier
                }));
            
            io.to(room.host).emit('playerCompleted', {
                playerName: player.name,
                word: answer,
                multiplier: multiplier,
                allCompletedPlayers: completedPlayers
            });
        } else {
            // Don't store incorrect words, allow player to try again
            socket.emit('invalidWord', { message: 'Word not in dictionary' });
        }
    });

    // Continue to next round (host only)
    socket.on('continueToNextRound', ({ roomCode }) => {
        const room = gameRooms.get(roomCode);
        
        if (!room || room.host !== socket.id) {
            socket.emit('error', { message: 'Not authorized to continue round' });
            return;
        }
        
        // Check if we should show mid-game summary (after round 5)
        if (room.currentRound === 5) {
            showMidGameSummary(roomCode);
        } else if (room.currentRound >= room.totalRounds) {
            endGame(roomCode);
        } else {
            room.currentRound++;
            startNewRound(roomCode);
        }
    });

    // Disconnect handling
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        // Remove player from any rooms
        gameRooms.forEach((room, roomCode) => {
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                const player = room.players[playerIndex];
                room.players.splice(playerIndex, 1);
                
                console.log(`${player.name} left room ${roomCode}`);
                
                // Notify remaining players
                io.to(roomCode).emit('playerLeft', { 
                    playerName: player.name,
                    players: room.players 
                });
                
                // Delete room if empty or if host left
                if (room.players.length === 0 || room.host === socket.id) {
                    gameRooms.delete(roomCode);
                    console.log(`Room ${roomCode} deleted`);
                }
            }
        });
    });
});

// Start new round
function startNewRound(roomCode) {
    const room = gameRooms.get(roomCode);
    if (!room) return;
    
    // Clear previous round answers
    room.roundAnswers.clear();
    
    // Generate new challenge
    room.currentChallenge = getRandomLetters();
    room.roundStartTime = Date.now();
    
    // Send challenge to all players
    io.to(roomCode).emit('newRound', {
        round: room.currentRound,
        totalRounds: room.totalRounds,
        firstLetter: room.currentChallenge.firstLetter,
        lastLetter: room.currentChallenge.lastLetter,
        timerDuration: room.timerDuration
    });
    
    // Auto-advance after timer duration (always runs full time)
    setTimeout(() => {
        // End round regardless of answers - show summary
        const correctAnswers = Array.from(room.roundAnswers.values()).filter(a => a.correct);
        
        if (correctAnswers.length === 0) {
            // No one answered correctly - find an example word
            const exampleWord = findExampleWord(
                room.currentChallenge.firstLetter,
                room.currentChallenge.lastLetter
            );
            
            io.to(roomCode).emit('roundTimeout', { exampleWord });
        } else {
            // Show round summary with all correct answers
            io.to(roomCode).emit('roundComplete', {
                correctAnswers: correctAnswers.map(a => ({
                    player: a.player.name,
                    word: a.answer,
                    points: Math.round((a.remainingTime / 1000) * (1000 / room.timerDuration))
                }))
            });
        }
        
        // Show round complete screen and wait for host to continue
        io.to(roomCode).emit('waitingForHost', {
            message: 'Waiting for host to start next round...'
        });
        
        // Only send continue button to host
        io.to(room.host).emit('showContinueButton', {
            currentRound: room.currentRound,
            totalRounds: room.totalRounds
        });
    }, room.timerDuration * 1000);  // Use room's timer duration in milliseconds
}

// Show mid-game summary after round 5
function showMidGameSummary(roomCode) {
    const room = gameRooms.get(roomCode);
    if (!room) return;
    
    // Sort players by score for mid-game ranking
    const midGameScores = room.players
        .sort((a, b) => b.score - a.score)  // Descending order - highest score first
        .map((p, index) => ({ 
            name: p.name, 
            score: p.score,
            rank: index + 1
        }));
    
    // Send mid-game summary to all players
    io.to(roomCode).emit('midGameSummary', {
        scores: midGameScores,
        currentRound: room.currentRound,
        totalRounds: room.totalRounds
    });
    
    console.log(`Mid-game summary shown in room ${roomCode}`);
    
    // Continue to next round after showing summary
    setTimeout(() => {
        room.currentRound++;
        startNewRound(roomCode);
    }, 8000); // 8 seconds for mid-game summary animation
}

// End game
function endGame(roomCode) {
    const room = gameRooms.get(roomCode);
    if (!room) return;
    
    // Sort players by score (HIGHEST score wins)
    const finalScores = room.players
        .sort((a, b) => b.score - a.score)  // Descending order - highest score wins!
        .map(p => ({ name: p.name, score: p.score }));
    
    // Send final results to all players
    io.to(roomCode).emit('gameOver', {
        scores: finalScores,
        winner: finalScores[0]
    });
    
    console.log(`Game ended in room ${roomCode}`);
}

// Start server
server.listen(PORT, () => {
    console.log(`🎮 WordWiz Server running on port ${PORT}`);
    console.log(`🌐 Local: http://localhost:${PORT}`);
    console.log(`🌐 Network: http://${LOCAL_IP}:${PORT}`);
    console.log(`📱 Share the Network URL with players on other devices!`);
});
