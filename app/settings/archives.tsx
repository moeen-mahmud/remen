import { ArchivesHome } from "@/components/archives/archive-home"
import { PageWrapper } from "@/components/page-wrapper"
import { SettingsHeader } from "@/components/settings/settings-header"

export default function ArchivesScreen() {
    return (
        <PageWrapper>
            <SettingsHeader title="Archives" showBackButton={true} />
            <ArchivesHome />
        </PageWrapper>
    )
}
