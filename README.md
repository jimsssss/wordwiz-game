# WordWiz - Multiplayer Speed Word Battle 🎮📚

A real-time multiplayer vocabulary game where players race to find words! Players join via room codes or QR codes on their phones and compete to be the first to type a valid word that starts and ends with given letters.

## 🌐 Play Now

**🎮 [Play WordWiz Live](https://wordwiz-game.onrender.com)**

Ready to play? Just visit the link above from any device - no installation required!

## 🌟 Features

- **Real-time Multiplayer**: True phone-to-phone gameplay using WebSockets
- **4-Digit Room Codes**: Easy to share and join
- **QR Code Support**: Scan to join instantly from any device
- **Mobile-First Design**: Fully responsive, works perfectly on phones
- **Speed-Based Scoring**: Faster answers earn more points (1-10 points)
- **ALL English Words**: Uses Dictionary API for complete English vocabulary validation
- **Live Leaderboard**: Real-time score updates for all players
- **Game Sounds**: Uplifting sound effects for wins, errors, and countdown
- **Example Words**: Shows example words when nobody answers
- **Fastest Player Display**: Shows who won with their word
- **Modern UI**: Beautiful Kahoot-inspired design

## 🎯 How to Play

1. **Host creates a room** - Visit the website and get a 4-digit code and QR code
2. **Players join** - Enter code or scan QR from their phones
3. **Host starts game** - Minimum 2 players required
4. **Race to answer** - All players see the same first/last letters
5. **Type ANY valid word** - Must start and end with given letters (3+ letters)
6. **Submit correct answers** - Players earn points for correct answers!
7. **10 rounds total** - Highest score wins the championship!

## 📱 Quick Start Guide

### For the Game Host:
1. Visit **[https://wordwiz-game.onrender.com](https://wordwiz-game.onrender.com)** on any device
2. Click "Create Game Room"
3. Share the 4-digit room code or QR code with your friends
4. Wait for players to join, then start the game!

### For Players:
1. Visit **[https://wordwiz-game.onrender.com](https://wordwiz-game.onrender.com)** on your phone/device
2. Click "Join Game Room"
3. Enter the 4-digit code or scan the QR code
4. Enter your name and wait for the host to start!

## 🎮 System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection
- Multiple devices for multiplayer fun (phones, tablets, laptops)
- **No downloads or installations needed!**

## 🎮 Game Rules

### Valid Words
- Minimum 3 letters (no 2-letter words)
- Must start with the given first letter
- Must end with the given last letter
- Must be a valid English word (verified via Dictionary API)
- **ALL English words accepted** - not limited to a small list!

### Scoring
- Points awarded only to the FIRST correct answer
- Faster answers = more points
- Maximum 10 points per round
- Points decrease based on time taken:
  - 0-3 seconds: 10 points
  - 3-6 seconds: 9 points
  - 6-9 seconds: 8 points
  - And so on...
  - Minimum: 1 point

### Game Flow
- 10 rounds per game
- 30 seconds per round
- If nobody answers correctly, no points awarded
- Automatic progression to next round

## 🐛 Troubleshooting

### QR Code Not Working
- Try refreshing the page if QR code doesn't load
- Make sure your device camera has permission to scan
- You can always manually enter the 4-digit room code instead

### Can't Connect to Game
- Check your internet connection
- Try refreshing the page
- Make sure you're using a supported browser (Chrome, Firefox, Safari, Edge)

### Game Not Loading
- Clear your browser cache and reload
- Disable any ad blockers temporarily
- Try using a different browser or device

## 📊 Technical Details

### Backend
- **Node.js** with Express server
- **Socket.IO** for WebSocket communication
- **In-memory** game state storage
- Room-based architecture
- Example word generation when nobody answers

### Frontend
- **Pure JavaScript** (no frameworks)
- **Socket.IO Client** for real-time updates
- **QRCode.js** for QR code generation
- **Dictionary API** for comprehensive word validation
- **Web Audio API** for game sounds
- **Responsive CSS** for mobile support

### Word Validation
- **Local cache**: 500+ common words for instant validation
- **Dictionary API**: ALL English words validated via free API
- **Fallback system**: Works offline with cached words if API unavailable

### Network Protocol
- WebSocket for bi-directional communication
- Event-based messaging
- Automatic reconnection handling

## 🎯 Game Events

### Server Events
- `createRoom` - Host creates a new game
- `joinRoom` - Player joins existing game
- `startGame` - Host starts the game
- `submitAnswer` - Player submits an answer
- `wordValidated` - Client validates word

### Client Events
- `roomCreated` - Room successfully created
- `playerJoined` - New player joined lobby
- `gameStarting` - Game is about to begin
- `newRound` - New round starting
- `roundWinner` - Someone won the round
- `gameOver` - Game finished

## 📄 License

This game is free to use, modify, and share. Have fun! 🎉

## 🙏 Credits

- Word database compiled from common English words
- Built with Socket.IO for real-time gameplay
- Designed with ❤️ for word game enthusiasts

---

**Ready to play? Visit the live website and let the word battle begin! 🏆**

🎮 **[Play WordWiz Now](https://wordwiz-game.onrender.com)**

For issues or questions, check the troubleshooting section above.
