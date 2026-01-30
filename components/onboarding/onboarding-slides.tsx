import { Bot, Camera, Mic, Search, Shield } from "lucide-react-native";

type OnboardingSlide = {
    id: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    gradient: [string, string];
};

export const onboardingSlides: OnboardingSlide[] = [
    {
        id: "ai",
        icon: <Bot size={48} color="#fff" />,
        title: "AI-Powered Intelligence",
        description: "Your notes are automatically categorized, tagged, and titled using on-device LLM.",
        gradient: ["#667eea", "#764ba2"],
    },
    {
        id: "privacy",
        icon: <Shield size={48} color="#fff" />,
        title: "Privacy First",
        description: "All processing stays on your device. You can sync your notes with your own iCloud account.",
        gradient: ["#fa709a", "#fee140"],
    },
    {
        id: "voice",
        icon: <Mic size={48} color="#fff" />,
        title: "Voice Notes",
        description: "Capture ideas instantly. AI transcribes and organizes your spoken thoughts.",
        gradient: ["#f093fb", "#f5576c"],
    },
    {
        id: "scan",
        icon: <Camera size={48} color="#fff" />,
        title: "Document Scanning",
        description: "Scan documents and handwritten notes with OCR.",
        gradient: ["#4facfe", "#00f2fe"],
    },
    {
        id: "search",
        icon: <Search size={48} color="#fff" />,
        title: "Semantic Search",
        description: "Find anything instantly using natural language along with keyword search.",
        gradient: ["#43e97b", "#38f9d7"],
    },
];
