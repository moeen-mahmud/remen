import { NoteDetails } from "@/components/notes/notes-details"
import { PageWrapper } from "@/components/page-wrapper"
import { SettingsHeader } from "@/components/settings/settings-header"

export default function NoteDetailsScreen() {
    return (
        <PageWrapper disableBottomPadding>
            <SettingsHeader title="View Note" showBackButton={true} />
            <NoteDetails />
        </PageWrapper>
    )
}
