import { PageWrapper } from "@/components/page-wrapper"
import { SettingsHeader } from "@/components/settings/settings-header"
import { TrashHome } from "@/components/settings/trash-home"

export default function TrashScreen() {
    return (
        <PageWrapper>
            <SettingsHeader title="Trash" showBackButton={true} />
            <TrashHome />
        </PageWrapper>
    )
}
