import { SpeedDial } from "@/components/fab";
import { NotesHome } from "@/components/notes/notes-home";
import { PageWrapper } from "@/components/page-wrapper";

export default function NotesScreen() {
    return (
        <PageWrapper disableBottomPadding>
            <NotesHome />
            <SpeedDial actions={[]} actionRoute="/" position="bottom-right" />
        </PageWrapper>
    );
}
