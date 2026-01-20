# **REMEN iOS Design Specification**

## **Design Philosophy**

- **Minimal & Clean**: Apple Notes/Craft aesthetic — maximum whitespace, no unnecessary UI
- **Speed-First**: Single screen is the entire app experience
- **Invisible Intelligence**: AI works silently in background
- **One-Handed**: All interactive elements reachable with thumb
- **Typography-Focused**: Text is the hero, not UI chrome

---

### **Color Palette**

| Token | Use | Value
|-----|-----|-----
| **Primary** | Subtle accent, interactive hints | Slate/Soft Grey (`#6B7280`)
| **Accent** | Action states, voice/scan buttons | Warm Neutral (`#D97706`) or Subtle Blue (`#3B82F6`)
| **Background** | Main canvas, pristine white | `#FFFFFF` / `#FAFAF9` (dark mode)
| **Text/Foreground** | Primary text | `#1F2937` (light) / `#F3F4F6` (dark)
| **Subtle Border** | Dividers, hints | `#E5E7EB`

---

### **Typography**

- **Font Family**: System font (SF Pro Display) — seamless iOS integration
- **Heading (Auto-Title)**: 32px, Bold, `#1F2937`
- **Body Text**: 16px, Regular, `#374151` (60% opacity for placeholder)
- **UI Labels**: 14px, Medium, `#6B7280`
- **Timestamp**: 12px, Regular, `#9CA3AF`

---

### **Core Screens**

#### **1. CAPTURE SCREEN**(Default, opens immediately)

```plaintext
┌─────────────────────────────────┐
│  9:41         •●●●●●●● 98%      │
├─────────────────────────────────┤
│                                 │
│  [Auto-generated Title]         │  ← Fades in after save
│                                 │
│  [Cursor blinks here]           │
│  Type your thoughts...          │
│  ...or use voice/scan below     │
│                                 │
│                                 │
│                                 │
│  ┌───────────────────────────┐  │
│  │ [🎤]  [📷]  [✓ Capture] │  │  ← Quick action bar
│  └───────────────────────────┘  │
│                                 │
│  87 characters   (subtle)       │
│                                 │
│  ← Drafts auto-saved            │
└─────────────────────────────────┘
```

**Key Details:**

- Full-screen textarea with iOS native keyboard
- Placeholder text: "What's on your mind?" (60% opacity)
- Auto-focus cursor ready to type
- Character count bottom-right (subtle, 12px)
- "Drafts auto-saved" hint appears after typing stops
- Three buttons in pill-shaped button bar: Voice (🎤), Scan (📷), Capture (✓)
- Haptic feedback on button press

---

#### **2. VOICE CAPTURE**(Activated by Voice button)

```plaintext
┌─────────────────────────────────┐
│  9:41         •●●●●●●● 98%      │
├─────────────────────────────────┤
│                                 │
│      ◯  ◯  ◯  ◯  ◯            │  ← Animated sound waves
│     ◯  ◯  ◯  ◯  ◯             │     (pulsing red circles)
│    ◯  ◯  ◯  ◯  ◯              │
│                                 │
│    "Listening..."               │  ← Text center
│                                 │
│    [Stop Recording]             │  ← Red button
│                                 │
│    Recorded: 0:32 seconds       │
│                                 │
│  ← Hold to record, release...   │
└─────────────────────────────────┘
```

**Key Details:**

- Fullscreen recording UI (minimalist)
- Animated waveform with pulsing red circles
- "Listening..." label center
- Large red "Stop Recording" button
- Shows elapsed time
- Subtitle: "Hold to record, release to transcribe"

---

#### **3. SCAN OCR**(Activated by Scan button)

```plaintext
┌─────────────────────────────────┐
│  < Scan Document                │
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  │   [Camera Viewfinder]   │    │
│  │  with edge guides       │    │
│  │                         │    │
│  │      [Auto-detect       │    │  ← Animated corners
│  │       document edges]   │    │
│  │                         │    │
│  │                         │    │
│  └─────────────────────────┘    │
│                                 │
│       [Tap to Capture]          │
│                                 │
│  Or use          Photo Library  │
│  ← Guides: align page edges     │
└─────────────────────────────────┘
```

**Key Details:**

- Full camera viewfinder with corner guides (animated)
- Auto-detection of document edges (ML Kit)
- Large tap zone to capture
- Option to use Photo Library
- Back button to return to capture screen

---

#### **4. OCR REVIEW**(After scan)

```plaintext
┌─────────────────────────────────┐
│  <  Review Scanned Text         │
├─────────────────────────────────┤
│                                 │
│  [📷 Original Image thumbnail]  │
│                                 │
│  Confidence: ████████░░ 92%     │  ← Progress bar
│                                 │
│  ┌─────────────────────────┐    │
│  │ Extracted text:         │    │
│  │                         │    │
│  │ [Editable text box]     │    │
│  │ User can fix errors     │    │
│  │                         │    │
│  │ [Date] [2026-01-20]    │    │
│  │ [Phone] +1(555)555...  │    │
│  └─────────────────────────┘    │
│                                 │
│  [← Edit]   [Capture ✓]         │
│                                 │
└─────────────────────────────────┘
```

**Key Details:**

- Thumbnail of original image (left side, dismissible)
- Confidence score as horizontal bar
- Editable textarea showing extracted text
- Detected entities shown as pills below (date, phone, etc.)
- Back/Edit button, Capture button to finalize

---

#### **5. AFTER CAPTURE**(Blank state with feedback)

```plaintext
┌─────────────────────────────────┐
│  9:42         •●●●●●●● 98%      │
├─────────────────────────────────┤
│                                 │
│          ✓                       │  ← Green checkmark
│                                 │
│     Note saved!                 │  ← Confirmation message
│                                 │
│     "Organizing..."             │  ← Brief loading state
│     ◐ (spinning icon)           │
│                                 │
│     Extracting entities...      │  ← Status text
│     Auto-tagging...             │
│                                 │
│  [New Blank Note]  [View]       │  ← Buttons
│                                 │
│  ← Swipe left to see list       │
└─────────────────────────────────┘
```

**Key Details:**

- Green checkmark animation on successful save
- "Note saved!" confirmation
- Brief "Organizing..." loading state (0.5s)
- Show processing tasks being done (entities, tagging)
- Two options: Start new note or View saved note
- Hint about swiping left to see notes list (hidden UI)

---

#### **6. NOTES LIST**(Swipe left or hamburger)

```plaintext
┌─────────────────────────────────┐
│  <  All Notes       🔍           │
├─────────────────────────────────┤
│                                 │
│  📌 Today                       │
│                                 │
│  ▪ Meeting with Sarah      2:30 │
│    Discuss project timeline     │
│    📅 Jan 20  👤 Sarah Adams   │
│                                 │
│  ▪ Quick idea: AI notes   1:15 │
│    Brainstorm interface        │
│    🔗 reference                 │
│                                 │
│  📌 Yesterday                   │
│                                 │
│  ▪ Workout notes          11:22 │
│    20 pushups, 30 min run      │
│    ☑ Health                    │
│                                 │
│  [Pull to refresh]              │
└─────────────────────────────────┘
```

**Key Details:**

- Grouped by date (Today, Yesterday, This Week, Older)
- Each note shows: Title, first line preview, time, auto-tags
- Auto-tags displayed as small pill icons (📅, 👤, 🔗, etc.)
- Pull-to-refresh functionality
- Search icon (🔍) at top right
- Swipe left to delete or archive

---

#### **7. SEARCH**(Semantic & keyword)

```plaintext
┌─────────────────────────────────┐
│  <  Search                       │
├─────────────────────────────────┤
│  [🔍 What are you looking for?] │
│                                 │
│  💡 Try searching for:          │
│                                 │
│  • "work notes from last week" │
│  • "ideas about AI"             │
│  • "meeting with Sarah"         │
│  • "January goals"              │
│                                 │
│  ────────────────────────────   │
│  Results for "AI":              │
│                                 │
│  ▪ Quick idea: AI notes   1:15 │
│    Brainstorm interface        │
│    🔗 reference                 │
│                                 │
│  ▪ Project ideas          8:45 │
│    Artificial intelligence...  │
│    📅 Jan 20                    │
│                                 │
└─────────────────────────────────┘
```

**Key Details:**

- Full-width search input
- Suggested search phrases when empty
- Real-time results as you type
- Results show: Title, preview, tags
- Semantic search + keyword matching

---

### **Interactive Elements**

#### **Buttons**

- **Primary Action (Capture)**: Orange/Warm grey circle with white text, 56px diameter
- **Secondary (Voice/Scan)**: Translucent white background with system icons
- **Text Buttons**: No background, underline on press, 14px SF Mono

#### **Animations**

- **Open to Capture**: 0.2s fade in
- **Save Confirmation**: 0.3s green checkmark + pulse
- **Loading State**: Spinning icon with subtle fade
- **Swipe Transition**: 0.3s ease-out slide
- **Voice Waves**: Continuous 1.5s pulsing animation (scale 1.0 → 1.3)

#### **Haptics**

- Tap buttons: Light haptic
- Save success: Medium + light double-tap
- Voice recording start/stop: Single medium tap

---

### **Dark Mode**

- Background: `#1F2937` (near black)
- Text: `#F3F4F6` (off-white)
- Borders: `#374151` (subtle grey)
- Accent: Lighter orange (`#FFA500`)
- Same layout, inverted colors

---

### **Spacing & Layout**

- **Padding**: 16px on sides, 24px top/bottom
- **Line Height**: 1.6 for body text
- **Gap between sections**: 20px
- **Button height**: 56px (thumb-friendly)
- **Safe areas**: Respects notch & home indicator

---

### **Micro-interactions**

1. **Placeholder fade-out**: Smoothly disappears as user types
2. **Tag pills**: Fade in 0.2s after AI processing
3. **Pull-to-refresh**: Bounces 0.4s, shows "Last updated 2m ago"
4. **Empty states**: Centered icon + descriptive message
5. **Error states**: Red/orange warning bubble, dismiss after 3s

---

### **Accessibility**

- Minimum touch target: 44x44pt
- High contrast ratios (WCAG AA)
- VoiceOver labels on all interactive elements
- Haptic feedback as alternative to visual cues
- Support for system text size preferences
- Dynamic Type support (scales with system settings)
