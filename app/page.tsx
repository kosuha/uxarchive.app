import { CanvasPanel } from "@/components/canvas"
import { LeftPanel } from "@/components/left-panel"
import { PatternWorkspaceProvider } from "@/components/pattern-workspace/pattern-workspace-provider"
import { RightPanel } from "@/components/right-panel"

export default function Home() {
  return (
    <PatternWorkspaceProvider>
      <LeftPanel />

      <CanvasPanel />
      <RightPanel />
    </PatternWorkspaceProvider>
  )
}
