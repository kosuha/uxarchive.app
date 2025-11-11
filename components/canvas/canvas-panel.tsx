"use client"

import { CaptureCanvas } from "./capture-canvas"
import { CaptureStrip } from "./capture-strip"
import { usePatternWorkspace } from "@/components/pattern-workspace/pattern-workspace-provider"

export const CanvasPanel = () => {
  const { activePattern, activeCapture, capturesForActivePattern, selectCapture } = usePatternWorkspace()

  const canShowStrip = capturesForActivePattern.length > 0 && !!activeCapture

  return (
    <section className="panel-column" data-panel="canvas">
      <div className="flex h-full flex-col">
        <div className="panel-scroll flex flex-col gap-6 p-6">
          <CaptureCanvas
            capture={activeCapture}
            patternName={activePattern?.name}
            serviceName={activePattern?.serviceName}
            totalCaptures={capturesForActivePattern.length}
            className="flex-1 min-h-full"
          />
        </div>

        {canShowStrip ? (
          <div className="border-t border-border/80 bg-background/95 px-6 py-5">
            <CaptureStrip
              captures={capturesForActivePattern}
              selectedCaptureId={activeCapture?.id ?? null}
              onSelectCapture={(captureId) => selectCapture(captureId)}
              showHeading={false}
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}
