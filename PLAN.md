# Remen - MVP Development Plan (ONLY FOR iOS)

## On-Device AI Architecture (ML Kit + Gemini Nano)

## Product Vision

A mobile-first note-taking app that prioritizes **zero-friction capture** with intelligent AI-powered organization and retrieval. The core philosophy: capture thoughts instantly, let AI handle organization in the background - all on-device, private, and free.

---

## Core Principles

1. **Speed First**: App opens directly to capture screen, no navigation required
2. **Privacy First**: AI processing happens on-device, notes never leave your phone (free tier)
3. **Intelligence in Background**: AI processes notes silently after capture
4. **Simple Interface, Powerful Features**: Minimal UI with sophisticated AI underneath
5. **Mobile-Native**: Designed for one-handed use, quick interactions
6. **Progressive Enhancement**: Works immediately with one note, gets smarter over time
7. **Offline First**: Works offline, no internet required
8. **No Cloud Sync**: No cloud sync, all data is stored locally

---

## AI Architecture Strategy

### Three-Tier Approach

```
┌─────────────────────────────────────────────┐
│  Tier 1: ML Kit (Always Free)               │
│  • OCR for handwritten notes                │
│  • Entity extraction (dates, names, emails) │
│  • Language detection                       │
│  • Basic text analysis                      │
│  ✅ Zero cost, maximum privacy              │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Tier 2: Gemini Nano (On-Device LLM)        │
│  • Title generation                         │
│  • Note type classification                 │
│  • Smart tagging                            │
│  • Task extraction                          │
│  • Basic summaries                          │
│  ✅ Free, private, works offline            │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Tier 3: Cloud AI (Optional Premium)        │
│  • Advanced semantic search                 │
│  • Multi-note insights                      │
│  • Complex analysis                         │
│  • Smart suggestions                        │
│  💎 Premium feature ($3-5/month)            │
└─────────────────────────────────────────────┘
```

### Why This Architecture?

**Free tier is ACTUALLY free:**

- 95% of users never need cloud AI
- No API costs for basic features
- Sustainable business model

**Privacy-first:**

- Notes processed on-device by default
- No data sent to servers unless user opts in
- Competitive advantage vs. cloud-only apps

**Works offline:**

- Full functionality without internet
- Perfect for capturing thoughts anywhere
- No sync delays

---

## MVP Feature Set

### Phase 1: Core Capture & ML Kit Integration (Week 1-2)

#### 1.1 Instant Capture Screen

**Default view when app opens**

- Full-screen textarea with cursor auto-focused
- Placeholder: "What's on your mind?"
- No navigation chrome until needed
- Auto-save draft to prevent data loss
- Character count (subtle, bottom corner)

**Technical Requirements:**

- React Native for cross-platform (Expo)
- Local SQLite database (expo-sqlite)
- Auto-focus on mount
- Debounced draft saving (every 2 seconds)

#### 1.2 Quick Actions Bar

**Below the capture textarea**

Three buttons:

- **Voice**: Speech-to-text capture
- **Scan**: Camera OCR for handwritten notes (ML Kit)
- **Capture**: Save current note

**Technical Requirements:**

- `@react-native-voice/voice` for speech recognition
- `react-native-executorch` for OCR
- `react-native-vision-camera` for camera access
- Haptic feedback on button press

#### 1.3 ML Kit OCR Integration

**Smart handwritten note scanning**

Camera workflow:

1. Open camera with real-time viewfinder
2. Auto-detect document edges
3. Capture image with guides
4. Process with ML Kit OCR
5. Show extracted text for review
6. Allow editing before saving
7. Store both original image + extracted text

**ML Kit Features to Use:**

- Text Recognition API (on-device)
- Language identification
- Structured text parsing (lists, tables)

function analyzeTextStructure(blocks) {
// Detect bullet points, numbered lists, headings
const lines = blocks.map(block => ({
text: block.text,
isBullet: /^[•\-*]\s/.test(block.text),
isNumbered: /^\d+\.\s/.test(block.text),
isHeading: block.text.length < 50 && block.text === block.text.toUpperCase()
}));

return lines;
}

````

#### 1.4 Entity-Based Auto-Tagging

**Using ML Kit entity extraction**

After note is saved, extract:

- **Dates** → auto-tag with date context ("January 2026")
- **People** → auto-tag with person names
- **Locations** → auto-tag with places mentioned
- **URLs** → make clickable, tag as "reference"
- **Phone/Email** → tag as "contact"

**Implementation:**

```javascript
async function autoTagFromEntities(noteText) {
  const entities = await EntityExtraction.extractEntities(noteText);

  const tags = [];

  // Date-based tags
  entities.filter(e => e.type === 'DATE').forEach(date => {
    tags.push(`📅 ${formatDate(date.value)}`);
  });

  // Person tags
  entities.filter(e => e.type === 'PERSON').forEach(person => {
    tags.push(`👤 ${person.value}`);
  });

  // Location tags
  entities.filter(e => e.type === 'ADDRESS').forEach(loc => {
    tags.push(`📍 ${loc.value}`);
  });

  // URL = reference material
  if (entities.some(e => e.type === 'URL')) {
    tags.push('🔗 reference');
  }

  return tags;
}
````

---

### Phase 2: Gemini Nano Integration (Week 3-4)

#### 2.1 Setup Gemini Nano

**Google's on-device LLM**

Gemini Nano is available via:

- **Android**: Google AI Edge SDK
- **iOS**: Will need alternative (see fallback strategy below)

**Installation:**

```bash

# iOS Use smaller ExecuTorch model or react native ml kit
bun install react-native-executorch
```

**Model Setup:**

```javascript
import { EdgeAI } from "@google/generative-ai-edge";

// Initialize on app start
const edgeAI = new EdgeAI({
    modelName: "gemini-nano",
    options: {
        temperature: 0.3, // More deterministic for classification
        maxOutputTokens: 50,
    },
});
```

#### 2.2 AI Note Processing Pipeline

**Runs after note is saved**

When user taps "Capture":

1. Save note to database immediately
2. Show brief loading: "Organizing..." (0.5s)
3. Process in background with Gemini Nano:
    - Generate title
    - Classify note type
    - Extract tasks
    - Suggest tags
    - Detect sentiment
4. Update note with AI metadata
5. Return to blank capture screen

**Processing Functions:**

````javascript
// Title Generation
async function generateTitle(noteContent) {
  const prompt = `Generate a concise, descriptive title (max 50 characters) for this note. Return ONLY the title, no quotes or extra text.

Note:
${noteContent.substring(0, 500)}

Title:`;

  const result = await edgeAI.generateText(prompt);
  return result.text.trim().substring(0, 50);
}

// Note Type Classification
async function classifyNoteType(noteContent) {
  const prompt = `Classify this note into ONE category. Return only the category name.

Categories:
- meeting (discussions, calls, meetings with people)
- task (todos, action items, things to do)
- idea (brainstorms, thoughts, concepts)
- journal (personal reflections, daily logs)
- reference (facts, information to remember)
- note (general notes that don't fit above)

Note:
${noteContent.substring(0, 300)}

Category:`;

  const result = await edgeAI.generateText(prompt);
  const type = result.text.trim().toLowerCase();

  const validTypes = ['meeting', 'task', 'idea', 'journal', 'reference', 'note'];
  return validTypes.includes(type) ? type : 'note';
}

// Task Extraction
async function extractTasks(noteContent) {
  const prompt = `Extract action items or tasks from this note. Return as a JSON array of strings. If no tasks, return empty array [].

Note:
${noteContent}

Tasks (JSON array):`;

  const result = await edgeAI.generateText(prompt);
  try {
    const tasks = JSON.parse(result.text);
    return Array.isArray(tasks) ? tasks : [];
  } catch {
    return [];
  }
}

// Smart Tag Suggestions
async function suggestTags(noteContent) {
  const prompt = `Suggest 2-4 relevant tags for organizing this note. Return as comma-separated words (lowercase, no hashtags).

Examples: work, personal, urgent, project-x, health, finance

Note:
${noteContent.substring(0, 300)}

Tags:`;

  const result = await edgeAI.generateText(prompt);
  const tags = result.text
    .split(',')
    .map(tag => tag.trim().toLowerCase())
    .filter(tag => tag.length > 0 && tag.length < 20)
    .slice(0, 4);

  return tags;
}

// Complete Processing Pipeline
async function processNoteWithAI(noteId, noteContent) {
  try {
    // Run all AI tasks in parallel
    const [title, type, tasks, aiTags] = await Promise.all([
      generateTitle(noteContent),
      classifyNoteType(noteContent),
      extractTasks(noteContent),
      suggestTags(noteContent)
    ]);

    // Also get ML Kit entities
    const entityTags = await autoTagFromEntities(noteContent);

    // Combine AI tags + entity tags
    const allTags = [...new Set([...aiTags, ...entityTags])];

    // Update note in database
    await database.updateNote(noteId, {
      title,
      type,
      tasks,
      tags: allTags,
      processedAt: new Date(),
      isProcessed: true
    });

    return true;
  } catch (error) {
    console.error('AI processing failed:', error);
    // Fallback: use simple rule-based processing
    return await fallbackProcessing(noteId, noteContent);
  }
}


---

### Phase 3: Search & Organization (Week 5-6)

#### 3.1 Local Semantic Search

**Using on-device embeddings**

For semantic "find notes about X" search, we need embeddings.

**Two approaches:**

**Option A: Lightweight Sentence Transformers (Recommended)**

```bash
bun install @xenova/transformers
````

```javascript
import { pipeline } from "@xenova/transformers";

// Load model once on app start
const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

async function generateEmbedding(text) {
    const result = await embedder(text, { pooling: "mean", normalize: true });
    return Array.from(result.data);
}

// When saving a note
async function saveNoteWithEmbedding(noteContent) {
    const embedding = await generateEmbedding(noteContent);

    await database.saveNote({
        content: noteContent,
        embedding: JSON.stringify(embedding), // Store as JSON in SQLite
        // ... other fields
    });
}

// Search with semantic similarity
async function searchNotes(query) {
    const queryEmbedding = await generateEmbedding(query);

    // Get all notes
    const allNotes = await database.getAllNotes();

    // Calculate cosine similarity
    const results = allNotes.map((note) => ({
        ...note,
        similarity: cosineSimilarity(queryEmbedding, JSON.parse(note.embedding)),
    }));

    // Sort by similarity
    return results
        .filter((r) => r.similarity > 0.5)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 20);
}

function cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magA * magB);
}
```

**Option B: Use Gemini Nano Embeddings**

```javascript
async function generateEmbeddingWithGemini(text) {
    const result = await edgeAI.embed(text);
    return result.embedding;
}
```

#### 3.2 Intent-Driven Search UI

Search interface that understands natural queries:

```javascript
const SearchScreen = () => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async (searchQuery) => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);

        // Combine semantic + keyword search
        const semanticResults = await searchNotes(searchQuery);
        const keywordResults = await keywordSearch(searchQuery);

        // Merge and deduplicate
        const merged = mergeSearchResults(semanticResults, keywordResults);

        setResults(merged);
        setIsSearching(false);
    };

    return (
        <View>
            <SearchBar
                placeholder="What are you looking for?"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={() => handleSearch(query)}
            />

            {/* Suggested searches */}
            {!query && (
                <View>
                    <Text>Try searching for:</Text>
                    <TouchableOpacity onPress={() => handleSearch("work notes from last week")}>
                        <Text>"work notes from last week"</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleSearch("ideas about AI")}>
                        <Text>"ideas about AI"</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Results */}
            {results.map((note) => (
                <NoteCard key={note.id} note={note} />
            ))}
        </View>
    );
};
```

#### 3.3 Related Notes Feature

Show related notes automatically:

```javascript
async function findRelatedNotes(noteId, limit = 5) {
    const note = await database.getNote(noteId);
    const noteEmbedding = JSON.parse(note.embedding);

    const allNotes = await database.getAllNotes();

    const related = allNotes
        .filter((n) => n.id !== noteId)
        .map((n) => ({
            ...n,
            similarity: cosineSimilarity(noteEmbedding, JSON.parse(n.embedding)),
        }))
        .filter((n) => n.similarity > 0.6)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

    return related;
}
```

---

### Phase 4: Premium Cloud Features (Week 7-8)

#### 4.1 Optional Cloud Tier

For users who want advanced features:

**Premium Features ($3-5/month):**

- Advanced multi-note analysis
- Smart weekly summaries
- Cross-note insights
- Better search across entire history
- Cloud backup & sync

**Architecture:**

```javascript
const isPremium = await checkPremiumStatus();

if (isPremium && userOptedIn) {
    // Use Claude API for advanced features
    const insights = await claudeAPI.analyzeNotes(notes);
} else {
    // Use on-device AI only
    const insights = await generateLocalInsights(notes);
}
```

**Implementation:**

```javascript
// Only called for premium users
async function generateWeeklyInsights(notes) {
    const weekNotes = notes.filter((n) => isFromThisWeek(n.createdAt));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.ANTHROPIC_API_KEY, // Stored securely
        },
        body: JSON.stringify({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 1000,
            messages: [
                {
                    role: "user",
                    content: `Analyze these notes from this week and provide insights:

${weekNotes.map((n) => n.content).join("\n\n---\n\n")}

Provide:
1. Main themes
2. Recurring topics
3. Action items to follow up on
4. Interesting connections`,
                },
            ],
        }),
    });

    const data = await response.json();
    return data.content[0].text;
}
```

#### 4.2 Revenue Model

**Free Tier (95% of users):**

- Unlimited notes
- On-device AI processing
- OCR scanning
- Basic search
- No cloud sync

**Premium Tier ($4.99/month):**

- Advanced AI insights
- Cloud backup & sync
- Multi-note analysis
- Weekly summaries
- Priority support
- Cross-device access

**Implementation:**

```javascript
// In-app purchases
import * as InAppPurchases from "expo-in-app-purchases";

async function subscribeToPremium() {
    await InAppPurchases.purchaseItemAsync("premium_monthly");
    // Grant access to cloud features
}
```

---

## Technical Architecture

### Tech Stack

**Mobile Framework:**

- **React Native** (0.73+)
    - Expo for easier development
    - Can eject if needed for native modules

**Database:**

- **SQLite** (react-native-sqlite-storage)
- Schema:

```sql
CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  title TEXT,
  type TEXT, -- meeting, task, idea, etc.
  created_at INTEGER,
  updated_at INTEGER,
  is_processed BOOLEAN DEFAULT 0,
  embedding TEXT, -- JSON array of floats
  original_image TEXT, -- path if scanned
  audio_file TEXT -- path if voice note
);

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE,
  color TEXT,
  is_auto BOOLEAN DEFAULT 1 -- auto-generated vs manual
);

CREATE TABLE note_tags (
  note_id TEXT,
  tag_id TEXT,
  PRIMARY KEY (note_id, tag_id),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  note_id TEXT,
  content TEXT,
  is_completed BOOLEAN DEFAULT 0,
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);

-- Index for fast searches
CREATE INDEX idx_notes_created ON notes(created_at DESC);
CREATE INDEX idx_notes_type ON notes(type);
```

**AI Services:**

- **ML Kit** (text recognition, entity extraction)
    - `react-native-executorch`
    - `react-native-executorch`
- **Gemini Nano** (Android on-device LLM)
    - `@google/generative-ai-edge`
- **ExecuTorch** (iOS fallback LLM)
    - `react-native-executorch` with SmolLM 360M
- **Transformers.js** (on-device embeddings)
    - `@xenova/transformers`
- **Claude API** (premium features only)
    - Anthropic SDK

**Other Dependencies:**

```json
{
    "dependencies": {
        "react-native": "^0.73.0",
        "expo": "~50.0.0",
        "@react-native-voice/voice": "^3.2.4",
        "react-native-vision-camera": "^3.8.0",
        "@google/generative-ai-edge": "^0.1.0",
        "react-native-executorch": "^0.3.0",
        "@xenova/transformers": "^2.10.0",
        "react-native-sqlite-storage": "^6.0.1",
        "expo-in-app-purchases": "~14.5.0",
        "@anthropic-ai/sdk": "^0.20.0"
    }
}
```

**Storage:**

- **Local-first** with SQLite
- **Cloud backup** (premium): Supabase Storage
- **Assets**: React Native File System

---

## Development Milestones

### Week 1: Foundation

- [x] Setup React Native project with Expo
- [x] Implement capture screen with auto-focus
- [x] Setup SQLite database + schema
- [x] Implement basic save/load
- [x] Add voice recording (basic)
- [x] Integrate ExecutorTorch OCR

### Week 2: ML Kit Integration

- [x] Camera UI for scanning
- [x] OCR processing pipeline
- [x] Entity extraction integration
- [x] Auto-tagging from entities
- [x] Image storage + text linking
- [x] Review/edit OCR results UI

### Week 3: Gemini Nano Setup

- [x] Install Google AI Edge SDK (Android)
- [x] Setup ExecuTorch fallback (iOS)
- [x] Test model loading and performance
- [x] Implement title generation
- [x] Implement type classification
- [x] Background processing queue

### Week 4: AI Processing Pipeline

- [x] Task extraction
- [x] Tag suggestions
- [x] Complete processing pipeline
- [x] Error handling + fallbacks
- [x] Processing indicators in UI
- [x] Note list view

### Week 5: Search Implementation

- [x] Setup Transformers.js embeddings
- [x] Generate embeddings on note save
- [x] Implement semantic search
- [x] Build search UI
- [x] Add search suggestions
- [x] Related notes feature

### Week 6: Polish & Optimization

- [x] Performance optimization
- [x] Loading states and animations
- [x] Error handling UX
- [x] Offline handling
- [x] App icons and branding
- [x] Onboarding flow

### Week 7: Premium Features

- [x] In-app purchase integration
- [x] Cloud API integration (Claude)
- [x] Weekly insights feature
- [x] Cloud backup (Supabase)
- [x] Sync logic
- [x] Premium UI/UX

### Week 8: Testing & Launch

- [x] User testing (10-20 people)
- [x] Bug fixes from testing
- [x] Performance profiling
- [x] App store assets
- [x] Privacy policy + terms
- [x] Submit to App Store + Play Store

---

## User Flows

### Primary Flow: Quick Capture

```
User opens app
  ↓
Cursor is already blinking in textarea
  ↓
User types thought
  ↓
Taps "Capture"
  ↓
Brief "Organizing..." (0.5s)
  ↓
Note saved, AI processing starts in background
  ↓
Return to blank capture screen
  ↓
[Background: Gemini Nano generates title, tags, classifies]
```

### Voice Capture Flow

```
User taps Voice button
  ↓
Mic activates, live transcription appears
  ↓
User speaks
  ↓
Taps "Done"
  ↓
Transcription saved as note
  ↓
ML Kit extracts entities
  ↓
Gemini Nano processes
```

### Scan Handwritten Note Flow

```
User taps Scan button
  ↓
Camera opens with document guides
  ↓
User positions note, auto-detects edges
  ↓
Taps capture or auto-captures
  ↓
ML Kit OCR processes image
  ↓
Shows extracted text
  ↓
User can edit if needed
  ↓
Taps "Save"
  ↓
ML Kit extracts entities
  ↓
Gemini Nano adds title, tags
  ↓
Original image + text stored
```

### Search Flow

```
User taps search icon
  ↓
Types: "show me work notes from last week"
  ↓
Transformers.js generates query embedding
  ↓
Semantic search + keyword search
  ↓
Results ranked by relevance
  ↓
User taps result → Note detail
  ↓
"Related Notes" section shown at bottom
```

---

## Performance Targets

### App Performance

- Cold start: < 2 seconds
- Warm start: < 0.5 seconds
- Note save: < 300ms
- OCR processing: < 2 seconds
- AI title generation: < 1 second
- Search results: < 500ms
- Smooth 60fps animations

### AI Processing Times (Target)

- **ML Kit OCR**: 1-2 seconds per image
- **Entity Extraction**: < 500ms
- **Gemini Nano title**: 500ms - 1s
- **Gemini Nano classification**: 300ms - 500ms
- **Embedding generation**: 200ms - 500ms
- **Total AI pipeline**: 2-3 seconds

### Storage Efficiency

- Average note: ~2KB
- With embedding: ~4KB
- 10,000 notes: ~40MB
- App size: ~150MB (including models)

---

## Privacy & Security

### Data Privacy

- **All notes stored locally** by default
- **No analytics tracking** in free tier
- **Optional cloud backup** (premium, encrypted)
- **On-device AI** means notes never sent to servers
- **Clear data export** option (JSON, Markdown)

### Security Measures

- SQLite encryption (SQLCipher)
- Biometric lock option
- Encrypted cloud backup (AES-256)
- No third-party trackers
- Open source roadmap (future)

### Privacy Policy Highlights

- "Your notes never leave your device unless you enable Premium cloud backup"
- "We don't train AI models on your data"
- "Delete your account = immediate data deletion"

---

## Cost Analysis

### Free Tier Costs (Per User/Month)

- ML Kit: $0 (on-device)
- Gemini Nano: $0 (on-device)
- Embeddings: $0 (on-device)
- Storage: $0 (local)
- **Total: $0** ✅

### Premium Tier Costs (Per User/Month)

- Claude API: ~$0.20 (weekly insights)
- Supabase storage: ~$0.05 (2GB limit)
- **Total cost: $0.25**
- **Charge: $4.99**
- **Profit margin: 95%** 💰

### Scaling Economics

- 1,000 free users: $0/month
- 100 premium users: $25 cost, $499 revenue
- 10,000 free + 500 premium: $125 cost, $2,495 revenue

**Break-even: ~50 premium subscribers** (covers infrastructure + development time)
