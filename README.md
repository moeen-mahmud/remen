# Remen

Remen turns thoughts into something you can return to.

A notes app for iOS: Zero-friction capture with voice or camera, search with natural language, and keep everything in sync with iCloud. AI runs on-device.

## Backstory

I've been using Apple Notes and Google Keep for years. I'm a big fan of the simplicity and ease of use. But most of the time I forgot the keywords to search for an specific note. This project was started as an R&D to see if I can run an language model on device to make it simple and easier to capture my messy thoughts, voices, tasks, scans, and reminders and organize (because I'm a lazy ass, can't even want to add a title) them in a way that I can easily search for them later. I wanted to make it minimal and maximize the privacy and the performance. After using my own app for few weeks, I believe it would be a good fit for someone else who wants to have similar experience.

## Features

- **Notes** — Create and edit notes (task notes, reminders). Pin, archive, trash or delete permanently.
- **Voice** — Record speech and save as a note (transcription).
- **Scan** — Capture a photo, extract text with on-device OCR, save as a note.
- **Search** — Keyword, semantic, and natural-language search (“what I wrote last week”).
- **AI** — On-device LLM and embeddings for search and auto categorization and tagging (models downloaded in-app).
- **iCloud** — Backup and sync notes; permanent deletes stay deleted across sync.

## Core Tech Stack

- [Typescript](https://www.typescriptlang.org)
- [Expo](https://expo.dev) (SDK 54)
- [React Native](https://reactnative.dev)
- [expo-router](https://expo.github.io/router)
- [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) for local storage
- [react-native-cloud-storage](github.com/kuatsu/react-native-cloud-storage) for iCloud
- [react-native-executorch](https://github.com/software-mansion/react-native-executorch) for on-device AI
- [react-native-vision-camera](https://github.com/mrousavy/react-native-vision-camera) for camera
- [react-native-voice](https://github.com/react-native-voice/voice) for voice recognition
- [NativeWind](https://www.nativewind.dev) (Tailwind for RN)
- [Gluestack UI](https://www.gluestack.io) (React Native UI library)

## AI Models Used

- [SMOLLM 2.1 135M](https://huggingface.co/software-mansion/react-native-executorch-smolLm-2/tree/main/smolLm-2-135M/original) for LLM
- [ALL-MINILM-L6-V2](https://huggingface.co/software-mansion/react-native-executorch-all-MiniLM-L6-v2) for embeddings
- [OCR_ENGLISH](https://huggingface.co/software-mansion/react-native-executorch-recognizer-crnn.en) for OCR

## Prerequisites

- Node.js 24+
- Bun
- iOS: Xcode, CocoaPods (for running on simulator or device)
- For voice: device or simulator with speech recognition
- For AI: download models in-app (first use)

## Run locally

```bash
git clone https://github.com/moeen-mahmud/remen.git
cd remen
bun install
```

> **Note:** You need to have [development build](https://docs.expo.dev/develop/development-builds/introduction/) for full features like camera and iCloud. Recommended not to use Expo Go for development.

**iOS device / full features:**

```bash
bun prebuild # bun prebuild:clean to clean the build
bun ios # optionally bun ios -d to run on physical device
```

## Scripts

| Command | Description |
|--------|-------------|
| `bun ios` | Run on iOS (after prebuild) |
| `bun lint` | Run ESLint |
| `bun format` | Format with Prettier |
| `bun type-check` | TypeScript check |

## Known Issues

Sometimes, the AI can hallucinate or take a while searching for notes, since it's a very (very again) small model and it's not trained on a lot of data. Besides, the OCR is not perfect and sometimes it can't extract the text from the image. AI processing is done in the background and it's not instant, for this reason, it'll drain a bit of battery and slow down the app (mostly in older devices).

- [ ] Voice recognition is not working on iOS simulator
- [ ] Camera is not working on iOS simulator
- [ ] iCloud is not working on iOS simulator

## License

[AGPL-3.0](LICENSE). See [LICENSE](LICENSE) for details.

## Author

[Moeen Mahmud](https://moeen.osmynt.dev) — [moeen@osmynt.dev](mailto:moeen@osmynt.dev)
