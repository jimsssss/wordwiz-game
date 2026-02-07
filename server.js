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

// Middleware for JSON parsing
app.use(express.json({ limit: '10mb' }));

// Game rooms storage
const gameRooms = new Map();

// Feedback storage
const feedbackStorage = [];
const MAX_FEEDBACK_ITEMS = 1000; // Limit stored feedback items

// Generate random 4-letter room code
function generateRoomCode() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code;
    do {
        code = '';
        for (let i = 0; i < 4; i++) {
            code += letters.charAt(Math.floor(Math.random() * letters.length));
        }
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

// ========================================
// FEEDBACK SYSTEM API ROUTES
// ========================================

// Submit feedback via REST API
app.post('/api/feedback', (req, res) => {
    try {
        const feedbackData = {
            id: Date.now() + Math.random(), // Unique ID
            ...req.body,
            serverTimestamp: new Date().toISOString(),
            ip: req.ip || req.connection.remoteAddress || 'unknown'
        };
        
        // Validate required fields
        if (!feedbackData.message || feedbackData.message.trim().length === 0) {
            return res.status(400).json({ error: 'Message is required' });
        }
        
        // Store feedback
        feedbackStorage.push(feedbackData);
        
        // Keep only recent feedback (prevent memory issues)
        if (feedbackStorage.length > MAX_FEEDBACK_ITEMS) {
            feedbackStorage.splice(0, feedbackStorage.length - MAX_FEEDBACK_ITEMS);
        }
        
        // Log feedback submission
        console.log(`📝 New feedback received:`, {
            type: feedbackData.type,
            rating: feedbackData.rating,
            player: feedbackData.playerName,
            room: feedbackData.roomCode,
            message: feedbackData.message.substring(0, 100) + (feedbackData.message.length > 100 ? '...' : '')
        });
        
        res.json({ 
            success: true, 
            message: 'Feedback submitted successfully',
            id: feedbackData.id
        });
        
    } catch (error) {
        console.error('Error saving feedback:', error);
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
});

// Get all feedback (admin endpoint)
app.get('/api/feedback', (req, res) => {
    try {
        // Add simple admin protection
        const adminKey = req.query.key || req.headers['x-admin-key'];
        const expectedKey = process.env.ADMIN_KEY || 'wordwiz-admin-2025';
        
        if (adminKey !== expectedKey) {
            return res.status(401).json({ 
                error: 'Unauthorized - Invalid admin key',
                hint: 'Add ?key=YOUR_ADMIN_KEY or set ADMIN_KEY environment variable'
            });
        }
        
        // Sort by timestamp (newest first)
        const sortedFeedback = [...feedbackStorage].sort((a, b) => 
            new Date(b.serverTimestamp) - new Date(a.serverTimestamp)
        );
        
        // Add summary statistics
        const stats = {
            total: feedbackStorage.length,
            byType: {},
            averageRating: 0,
            recentCount: 0
        };
        
        feedbackStorage.forEach(fb => {
            // Count by type
            stats.byType[fb.type] = (stats.byType[fb.type] || 0) + 1;
            
            // Average rating (only count ratings > 0)
            if (fb.rating && fb.rating > 0) {
                stats.averageRating += fb.rating;
            }
            
            // Count recent feedback (last 24 hours)
            const feedbackTime = new Date(fb.serverTimestamp);
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            if (feedbackTime > dayAgo) {
                stats.recentCount++;
            }
        });
        
        // Calculate average rating
        const ratedFeedback = feedbackStorage.filter(fb => fb.rating && fb.rating > 0);
        stats.averageRating = ratedFeedback.length > 0 
            ? (stats.averageRating / ratedFeedback.length).toFixed(2)
            : 0;
        
        res.json({
            success: true,
            stats,
            feedback: sortedFeedback,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error retrieving feedback:', error);
        res.status(500).json({ error: 'Failed to retrieve feedback' });
    }
});

// Delete feedback item (admin endpoint)
app.delete('/api/feedback/:id', (req, res) => {
    try {
        const adminKey = req.query.key || req.headers['x-admin-key'];
        const expectedKey = process.env.ADMIN_KEY || 'wordwiz-admin-2025';
        
        if (adminKey !== expectedKey) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const feedbackId = parseFloat(req.params.id);
        const index = feedbackStorage.findIndex(fb => fb.id === feedbackId);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Feedback not found' });
        }
        
        feedbackStorage.splice(index, 1);
        console.log(`🗑️ Feedback deleted: ${feedbackId}`);
        
        res.json({ 
            success: true, 
            message: 'Feedback deleted successfully' 
        });
        
    } catch (error) {
        console.error('Error deleting feedback:', error);
        res.status(500).json({ error: 'Failed to delete feedback' });
    }
});

// Simple admin dashboard
app.get('/admin', (req, res) => {
    const adminKey = req.query.key || 'wordwiz-admin-2025';
    
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>WordWiz Admin Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                margin: 0; 
                padding: 20px; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                color: #333;
            }
            .container { 
                max-width: 1200px; 
                margin: 0 auto; 
                background: white; 
                border-radius: 15px; 
                padding: 30px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            }
            h1 { color: #667eea; margin-bottom: 30px; }
            .stats { 
                display: grid; 
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
                gap: 20px; 
                margin-bottom: 30px;
            }
            .stat-card { 
                background: linear-gradient(135deg, #f8f9fa, #e9ecef); 
                padding: 20px; 
                border-radius: 10px; 
                text-align: center;
                border-left: 4px solid #667eea;
            }
            .stat-number { 
                font-size: 2rem; 
                font-weight: bold; 
                color: #667eea; 
                display: block;
            }
            .feedback-item { 
                background: #f8f9fa; 
                margin: 10px 0; 
                padding: 20px; 
                border-radius: 10px; 
                border-left: 4px solid #28a745;
            }
            .feedback-item.bug { border-left-color: #dc3545; }
            .feedback-item.suggestion { border-left-color: #007bff; }
            .feedback-item.compliment { border-left-color: #28a745; }
            .feedback-item.other { border-left-color: #6c757d; }
            .feedback-meta { 
                font-size: 0.9rem; 
                color: #6c757d; 
                margin-bottom: 10px;
            }
            .rating { color: #ffc107; }
            .message { 
                font-size: 1.1rem; 
                line-height: 1.5; 
                margin: 10px 0;
                background: white;
                padding: 15px;
                border-radius: 8px;
            }
            .btn { 
                background: #667eea; 
                color: white; 
                border: none; 
                padding: 10px 20px; 
                border-radius: 5px; 
                cursor: pointer;
                margin: 5px;
            }
            .btn:hover { background: #5a67d8; }
            .btn.danger { background: #dc3545; }
            .btn.danger:hover { background: #c82333; }
            .loading { text-align: center; padding: 40px; color: #6c757d; }
            .error { color: #dc3545; background: #f8d7da; padding: 15px; border-radius: 5px; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📊 WordWiz Admin Dashboard</h1>
            
            <div class="stats" id="stats">
                <div class="loading">Loading statistics...</div>
            </div>
            
            <div style="margin: 20px 0;">
                <button class="btn" onclick="loadFeedback()">🔄 Refresh Feedback</button>
                <button class="btn danger" onclick="confirmDeleteAll()">🗑️ Clear All Feedback</button>
            </div>
            
            <div id="feedback-list">
                <div class="loading">Loading feedback...</div>
            </div>
        </div>

        <script>
            const ADMIN_KEY = '${adminKey}';
            
            async function loadFeedback() {
                try {
                    const response = await fetch('/api/feedback?key=' + ADMIN_KEY);
                    if (!response.ok) {
                        throw new Error('Failed to load feedback: ' + response.status);
                    }
                    
                    const data = await response.json();
                    displayStats(data.stats);
                    displayFeedback(data.feedback);
                } catch (error) {
                    console.error('Error:', error);
                    document.getElementById('feedback-list').innerHTML = 
                        '<div class="error">Error loading feedback: ' + error.message + '</div>';
                }
            }
            
            function displayStats(stats) {
                const statsHtml = \`
                    <div class="stat-card">
                        <span class="stat-number">\${stats.total}</span>
                        <div>Total Feedback</div>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">\${stats.recentCount}</span>
                        <div>Last 24 Hours</div>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">\${stats.averageRating}⭐</span>
                        <div>Average Rating</div>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">\${Object.keys(stats.byType).length}</span>
                        <div>Categories Used</div>
                    </div>
                \`;
                document.getElementById('stats').innerHTML = statsHtml;
            }
            
            function displayFeedback(feedback) {
                if (feedback.length === 0) {
                    document.getElementById('feedback-list').innerHTML = '<div class="loading">No feedback yet</div>';
                    return;
                }
                
                const feedbackHtml = feedback.map(fb => \`
                    <div class="feedback-item \${fb.type}">
                        <div class="feedback-meta">
                            <strong>\${fb.type.toUpperCase()}</strong> • 
                            <span class="rating">\${fb.rating ? '⭐'.repeat(fb.rating) : 'No rating'}</span> • 
                            Player: <strong>\${fb.playerName || 'Anonymous'}</strong> • 
                            Room: \${fb.roomCode || 'None'} • 
                            \${new Date(fb.serverTimestamp).toLocaleString()}
                            \${fb.email ? ' • Email: ' + fb.email : ''}
                        </div>
                        <div class="message">\${fb.message}</div>
                        <button class="btn danger" onclick="deleteFeedback(\${fb.id})">Delete</button>
                    </div>
                \`).join('');
                
                document.getElementById('feedback-list').innerHTML = feedbackHtml;
            }
            
            async function deleteFeedback(id) {
                if (!confirm('Delete this feedback?')) return;
                
                try {
                    const response = await fetch('/api/feedback/' + id + '?key=' + ADMIN_KEY, {
                        method: 'DELETE'
                    });
                    
                    if (response.ok) {
                        loadFeedback(); // Reload
                    } else {
                        alert('Failed to delete feedback');
                    }
                } catch (error) {
                    alert('Error: ' + error.message);
                }
            }
            
            function confirmDeleteAll() {
                if (confirm('Are you sure you want to delete ALL feedback? This cannot be undone.')) {
                    if (confirm('This will permanently delete all feedback. Are you absolutely sure?')) {
                        // Implementation for bulk delete would go here
                        alert('Bulk delete not implemented yet. Delete items individually.');
                    }
                }
            }
            
            // Load feedback on page load
            loadFeedback();
        </script>
    </body>
    </html>
    `);
});

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
            timerDuration: 20  // Default 20 seconds
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
            // Use the same formula as display: (4350 + remainingTime) / 1000 * (1000 / timerDuration)
            const basePoints = Math.max(1, Math.round(((4350 + actualRemainingTime) / 1000) * (1000 / room.timerDuration)));
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

    // Submit feedback via Socket.IO (fallback method)
    socket.on('submitFeedback', (feedbackData) => {
        try {
            const enhancedFeedbackData = {
                id: Date.now() + Math.random(), // Unique ID
                ...feedbackData,
                serverTimestamp: new Date().toISOString(),
                ip: socket.request.connection.remoteAddress || 'unknown',
                socketId: socket.id
            };
            
            // Validate required fields
            if (!enhancedFeedbackData.message || enhancedFeedbackData.message.trim().length === 0) {
                socket.emit('feedbackError', { message: 'Message is required' });
                return;
            }
            
            // Store feedback
            feedbackStorage.push(enhancedFeedbackData);
            
            // Keep only recent feedback
            if (feedbackStorage.length > MAX_FEEDBACK_ITEMS) {
                feedbackStorage.splice(0, feedbackStorage.length - MAX_FEEDBACK_ITEMS);
            }
            
            // Log feedback submission
            console.log(`📝 Feedback via Socket.IO:`, {
                type: enhancedFeedbackData.type,
                rating: enhancedFeedbackData.rating,
                player: enhancedFeedbackData.playerName,
                room: enhancedFeedbackData.roomCode,
                message: enhancedFeedbackData.message.substring(0, 100) + (enhancedFeedbackData.message.length > 100 ? '...' : '')
            });
            
            // Acknowledge success
            socket.emit('feedbackSubmitted', { 
                success: true, 
                message: 'Feedback submitted successfully',
                id: enhancedFeedbackData.id
            });
            
        } catch (error) {
            console.error('Error saving feedback via Socket.IO:', error);
            socket.emit('feedbackError', { message: 'Failed to submit feedback' });
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
    
    // Send challenge to all players (display duration is what players see)
    io.to(roomCode).emit('newRound', {
        round: room.currentRound,
        totalRounds: room.totalRounds,
        firstLetter: room.currentChallenge.firstLetter,
        lastLetter: room.currentChallenge.lastLetter,
        timerDuration: room.timerDuration  // This is the display time (10, 20, or 30)
    });
    
    // Auto-advance after ACTUAL duration (display time + 3 seconds for countdown)
    // This ensures players get the full time they expect to play
    const actualDuration = room.timerDuration + 4.35; // Add 3 seconds for countdown
    
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
                correctAnswers: correctAnswers.map(a => {
                    // Calculate base points using the same formula as actual scoring
                    const basePoints = Math.round(((4350 + a.remainingTime) / 1000) * (1000 / room.timerDuration));
                    // Apply the multiplier just like in actual scoring
                    const finalPoints = basePoints * (a.multiplier || 1);
                    return {
                        player: a.player.name,
                        word: a.answer,
                        points: finalPoints
                    };
                })
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
    }, actualDuration * 1000);  // Use actual duration (display time + countdown time)
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
