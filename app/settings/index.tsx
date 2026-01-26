import { PageWrapper } from "@/components/page-wrapper";
import { SettingsHeader } from "@/components/settings/settings-header";
import { SettingsHome } from "@/components/settings/settings-home/settings-home";

export default function SettingsScreen() {
    return (
        <PageWrapper>
            <SettingsHeader title="Settings" showBackButton={true} />
            <SettingsHome />
        </PageWrapper>
    );
}
