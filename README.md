# WordWiz - Multiplayer Speed Word Battle 🎮📚

A real-time multiplayer vocabulary game where players race to find words! Players join via room codes or QR codes on their phones and compete to be the first to type a valid word that starts and ends with given letters.

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

1. **Host creates a room** - Gets a 4-digit code and QR code
2. **Players join** - Enter code or scan QR from their phones
3. **Host starts game** - Minimum 2 players required
4. **Race to answer** - All players see the same first/last letters
5. **Type ANY valid word** - Must start and end with given letters (3+ letters)
6. **Submit correct answers** - Players earn points for correct answers!
7. **10 rounds total** - Highest score wins the championship!

## 📋 Requirements

- **Node.js** version 14 or higher
- **npm** (comes with Node.js)
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Multiple devices for multiplayer (phones, tablets, laptops)

## 🚀 Installation & Setup

### Step 1: Install Node.js

If you don't have Node.js installed:

**macOS:**
```bash
brew install node
```

**Windows:**
Download from https://nodejs.org

**Linux:**
```bash
sudo apt-get install nodejs npm
```

Verify installation:
```bash
node --version
npm --version
```

### Step 2: Install Dependencies

Navigate to the game folder and install required packages:

```bash
cd "/Users/jimsxc/Downloads/Vocabulary game"
npm install
```

This will install:
- `express` - Web server
- `socket.io` - Real-time communication

### Step 3: Start the Server

```bash
npm start
```

You should see:
```
🎮 WordWiz Server running on port 3000
🌐 Open http://localhost:3000 to play
```

### Step 4: Play!

**On the host device (computer/phone):**
1. Open `http://localhost:3000`
2. Click "Create Game Room"
3. Share the 4-digit code or QR code with friends

**On player devices (phones/tablets):**
1. Open `http://[HOST_IP]:3000` (replace HOST_IP with host's local IP)
2. Click "Join Game Room"
3. Enter the 4-digit code or scan QR code
4. Enter your name
5. Wait for host to start the game

## 🌐 Finding Your Local IP Address

**macOS/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Windows:**
```bash
ipconfig
```

Look for "IPv4 Address" (usually starts with 192.168.x.x or 10.0.x.x)

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

## 📱 Mobile Access

### Same WiFi Network (Easiest)
1. Make sure all devices are on the same WiFi
2. Find host's local IP address (e.g., 192.168.1.100)
3. On player devices, navigate to `http://192.168.1.100:3000`

### Public Access (Advanced)
To play with friends not on your network:
1. Deploy to a hosting service (Heroku, Render, Railway, etc.)
2. Or use ngrok for temporary public URL:
   ```bash
   npx ngrok http 3000
   ```

## 🛠️ Development

### Run with Auto-Reload
```bash
npm run dev
```

This uses nodemon to automatically restart the server when you make changes.

### File Structure
```
Vocabulary game/
├── server.js           # Node.js backend server
├── game.js             # Client-side game logic
├── words.js            # Word database (500+ words)
├── index.html          # Main HTML file
├── styles.css          # Styling
├── package.json        # Node.js dependencies
└── README.md           # This file
```

## 🎨 Customization

### Change Number of Rounds
Edit `server.js`, line ~52:
```javascript
totalRounds: 10,  // Change to desired number
```

### Change Timer Duration
Edit `server.js`, line ~287:
```javascript
timerDuration: 30  // Change to desired seconds
```

### Add More Words
Edit `words.js` and add words to the `WORD_DATABASE` array.

### Change Colors
Edit `styles.css` to modify the color scheme.

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Players Can't Connect
- Verify all devices are on same WiFi
- Check firewall settings
- Try using host's IP address instead of localhost

### QR Code Not Working
- Make sure you're using the full URL with IP address
- Ensure QR code library loaded (check browser console)

### Words Not Validating
- Check that `words.js` is loaded
- Open browser console to see errors
- Verify word is in the database

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

**Ready to play? Start the server and let the word battle begin! 🏆**

For issues or questions, check the troubleshooting section above.
