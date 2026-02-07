// Comprehensive word database for the vocabulary game
// Words are organized by length (3+ letters only, as 2-letter words are invalid)

const WORD_DATABASE = [
    // 3-letter words
    "cat", "dog", "bat", "hat", "rat", "mat", "sun", "fun", "run", "gun",
    "pen", "hen", "ten", "men", "den", "car", "bar", "jar", "tar", "war",
    "cup", "pup", "top", "hop", "mop", "pop", "bed", "red", "fed", "led",
    "box", "fox", "mix", "fix", "six", "bag", "tag", "rag", "wag", "lag",
    "map", "tap", "cap", "gap", "nap", "sit", "hit", "bit", "fit", "kit",
    "hot", "not", "pot", "dot", "lot", "big", "dig", "fig", "jig", "pig",
    
    // 4-letter words
    "book", "cook", "look", "took", "hook", "love", "dove", "move", "cove", "wove",
    "time", "dime", "lime", "mime", "game", "name", "same", "tame", "fame", "came",
    "hope", "rope", "cope", "dope", "mope", "bike", "hike", "like", "mike", "pike",
    "fire", "wire", "tire", "dire", "hire", "make", "take", "wake", "bake", "cake",
    "fish", "dish", "wish", "tree", "free", "flee", "knee", "star", "scar", "char",
    "blue", "glue", "true", "clue", "moon", "soon", "noon", "boon", "door", "poor",
    "mind", "kind", "find", "wind", "bind", "walk", "talk", "milk", "silk", "gift",
    "king", "ring", "sing", "wing", "ding", "fast", "last", "past", "cast", "mast",
    "play", "clay", "gray", "pray", "stay", "song", "long", "gong", "kong", "pong",
    
    // 5-letter words
    "happy", "sunny", "funny", "bunny", "money", "honey", "dance", "lance", "prance", "glance",
    "table", "cable", "fable", "gable", "light", "night", "fight", "might", "sight", "right",
    "green", "queen", "sheen", "small", "trail", "snail", "brain", "train", "grain", "drain",
    "beach", "teach", "reach", "peach", "world", "bread", "dread", "tread", "magic", "basic",
    "brave", "grave", "shave", "crave", "story", "glory", "fruit", "smart", "start", "chart",
    "party", "heart", "paint", "point", "joint", "grand", "brand", "stand", "plant", "grant",
    "catch", "watch", "patch", "match", "batch", "think", "drink", "blink", "stink", "clink",
    "fresh", "flesh", "sweet", "sleep", "steep", "creep", "sweep", "brown", "crown", "drown",
    "spark", "shark", "stark", "clear", "spear", "shear", "dream", "cream", "steam", "gleam",
    "smile", "while", "style", "stone", "phone", "clone", "throne", "alone", "house", "mouse",
    
    // 6-letter words
    "castle", "battle", "rattle", "cattle", "basket", "market", "carpet", "target", "garden", "pardon",
    "friend", "attend", "defend", "offend", "bridge", "fridge", "orange", "change", "danger", "ranger",
    "simple", "dimple", "pimple", "temple", "purple", "circle", "muscle", "double", "bubble", "rubble",
    "summer", "hammer", "stammer", "winter", "filter", "silver", "finger", "ginger", "singer", "bringer",
    "turtle", "hurtle", "myrtle", "gentle", "mental", "dental", "rental", "portal", "mortal", "normal",
    "forest", "honest", "modest", "pocket", "rocket", "socket", "bucket", "ticket", "wicket", "cricket",
    "dragon", "wagon", "reason", "season", "person", "prison", "vision", "fusion", "flower", "shower",
    "butter", "letter", "better", "matter", "pattern", "lantern", "modern", "golden", "wooden", "broken",
    "master", "faster", "Easter", "plaster", "planet", "magnet", "carpet", "rabbit", "combat", "format",
    "animal", "manual", "casual", "visual", "dental", "mental", "gentle", "settle", "bottle", "little",
    
    // 7-letter words
    "kitchen", "chicken", "thicken", "quicken", "blanket", "bracket", "cricket", "trinket", "program", "diagram",
    "weather", "feather", "leather", "brother", "another", "teacher", "preacher", "bleacher", "picture", "mixture",
    "culture", "nature", "capture", "feature", "texture", "lecture", "gesture", "venture", "pasture", "monster",
    "hamster", "blaster", "disaster", "chapter", "aughter", "aughter", "captain", "certain", "curtain", "mountain",
    "freedom", "kingdom", "boredom", "wisdom", "stardom", "perfect", "respect", "inspect", "suspect", "project",
    "subject", "object", "reject", "protect", "collect", "correct", "connect", "reflect", "example", "trample",
    "general", "mineral", "funeral", "central", "neutral", "natural", "textural", "musical", "magical", "typical",
    "history", "mystery", "battery", "pottery", "lottery", "factory", "victory", "century", "country", "library",
    "problem", "freedom", "system", "custom", "wisdom", "random", "seldom", "tandem", "pattern", "lantern",
    "science", "silence", "balance", "advance", "romance", "finance", "absence", "essence", "defense", "offense",
    
    // 8-letter words
    "computer", "together", "remember", "November", "December", "reporter", "supporter", "daughter", "laughter", "slaughter",
    "complete", "concrete", "discrete", "obsolete", "treasure", "pleasure", "measure", "pressure", "creature", "fracture",
    "standard", "backward", "forward", "awkward", "inward", "outward", "upward", "downward", "wayward", "steward",
    "elephant", "pleasant", "constant", "distant", "instant", "pregnant", "relevant", "abundant", "ignorant", "important",
    "birthday", "Thursday", "Saturday", "yesterday", "everyday", "someday", "holiday", "workday", "weekday", "payday",
    "creation", "relation", "vacation", "location", "nation", "station", "ration", "action", "fraction", "traction",
    "surprise", "comprise", "exercise", "paradise", "disguise", "improvise", "memorize", "organize", "finalize", "realize",
    "strength", "breadth", "warmth", "growth", "stealth", "wealth", "health", "beneath", "research", "approach",
    "building", "learning", "teaching", "reaching", "catching", "matching", "watching", "pitching", "stitching", "switching",
    "mountain", "fountain", "certain", "curtain", "captain", "chieftain", "maintain", "contain", "sustain", "obtain",
    
    // 9-letter words  
    "beautiful", "wonderful", "powerful", "colorful", "delightful", "plentiful", "bountiful", "respectful", "forgetful", "masterful",
    "adventure", "furniture", "signature", "departure", "miniature", "temperature", "structure", "sculpture", "literature", "moisture",
    "celebrate", "eliminate", "fascinate", "generate", "hibernate", "illustrate", "navigate", "penetrate", "cultivate", "fortunate",
    "community", "chemistry", "discovery", "machinery", "stationery", "monastery", "necessary", "secretary", "voluntary", "imaginary",
    "dimension", "extension", "attention", "invention", "retention", "suspension", "expansion", "mansion", "pension", "tension",
    "beginning", "lightning", "frightening", "happening", "listening", "reasoning", "seasoning", "weakening", "thickening", "reckoning",
    "chocolate", "immediate", "accurate", "desperate", "elaborate", "alternate", "fortunate", "moderate", "corporate", "separate",
    "knowledge", "challenge", "advantage", "encourage", "privilege", "cartridge", "partridge", "message", "package", "language",
    "everybody", "somebody", "anybody", "yesterday", "butterfly", "dragonfly", "jellyfish", "swordfish", "starfish", "goldfish",
    "happiness", "sadness", "kindness", "goodness", "darkness", "weakness", "sickness", "thickness", "quickness", "awareness"
];

// Function to get all valid words
function getAllWords() {
    return WORD_DATABASE;
}

// Function to check if a word exists in the database
async function isValidWord(word) {
    const normalizedWord = word.toLowerCase().trim();
    
    // Check minimum length (no 2-letter words)
    if (normalizedWord.length < 3) {
        return false;
    }
    
    // First check our local database for common words (faster)
    if (WORD_DATABASE.includes(normalizedWord)) {
        return true;
    }
    
    // If not in local database, check with online dictionary API
    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${normalizedWord}`);
        if (response.ok) {
            const data = await response.json();
            return data.length > 0; // Valid if dictionary returns data
        }
        return false;
    } catch (error) {
        // If API fails, fallback to local database only
        console.error('Dictionary API error:', error);
        return false;
    }
}

// Function to get a random word
function getRandomWord() {
    const randomIndex = Math.floor(Math.random() * WORD_DATABASE.length);
    return WORD_DATABASE[randomIndex];
}

// Function to get words by length
function getWordsByLength(length) {
    return WORD_DATABASE.filter(word => word.length === length);
}

// Function to get words by first and last letter
function getWordsByFirstAndLast(firstLetter, lastLetter) {
    return WORD_DATABASE.filter(word => 
        word.charAt(0).toLowerCase() === firstLetter.toLowerCase() &&
        word.charAt(word.length - 1).toLowerCase() === lastLetter.toLowerCase()
    );
}
