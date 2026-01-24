import { PageWrapper } from "@/components/page-wrapper"
import { ArchivesHome } from "@/components/settings/archive-home"
import { SettingsHeader } from "@/components/settings/settings-header"

export default function ArchivesScreen() {
    return (
        <PageWrapper>
            <SettingsHeader title="Archives" showBackButton={true} />
            <ArchivesHome />
        </PageWrapper>
    )
}
