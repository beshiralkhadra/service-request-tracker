import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { ApplicationView } from "@/features/auth/components/application-view";
import { RequestsOverview } from "@/features/requests/components/requests-overview";

export default function Home() {
  return (
    <ApplicationView>
      <WorkspaceShell>
        <RequestsOverview />
      </WorkspaceShell>
    </ApplicationView>
  );
}
