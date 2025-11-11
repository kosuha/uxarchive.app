import { ChevronDown, ChevronRight } from "lucide-react"

import { PatternList } from "./pattern-list"
import type { FolderTreeNode } from "./use-left-panel-data"

interface FolderTreeProps {
  nodes: FolderTreeNode[]
  expandedFolders: Set<string>
  onToggle: (folderId: string) => void
  isFiltering?: boolean
}

interface FolderBranchProps {
  node: FolderTreeNode
  expandedFolders: Set<string>
  onToggle: (folderId: string) => void
}

const FolderBranch = ({ node, expandedFolders, onToggle }: FolderBranchProps) => {
  const isExpandable = node.children.length > 0 || node.patterns.length > 0
  const isExpanded = expandedFolders.has(node.folder.id)

  return (
    <li key={node.folder.id} className="space-y-2">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-xl border border-transparent px-3 py-2 text-left text-sm transition hover:border-border/60"
        onClick={() => isExpandable && onToggle(node.folder.id)}
        aria-expanded={isExpanded}
      >
        <span className="flex items-center gap-2">
          {isExpandable ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <span className="h-4 w-4" />
          )}
          <span className="font-medium">{node.folder.name}</span>
        </span>
        <span className="text-xs text-muted-foreground">{node.visiblePatternCount}</span>
      </button>

      {isExpanded && (
        <>
          <PatternList patterns={node.patterns} indentLevel={node.depth + 1} />
          {node.children.length > 0 && (
            <ul className="space-y-2 border-l border-dashed border-border/70 pl-4">
              {node.children.map((child) => (
                <FolderBranch key={child.folder.id} node={child} expandedFolders={expandedFolders} onToggle={onToggle} />
              ))}
            </ul>
          )}
        </>
      )}
    </li>
  )
}

export const FolderTree = ({ nodes, expandedFolders, onToggle, isFiltering }: FolderTreeProps) => {
  if (!nodes.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 px-4 py-6 text-center text-sm text-muted-foreground">
        {isFiltering
          ? "선택한 검색/필터 조합과 일치하는 패턴이 없습니다. 조건을 조정해보세요."
          : "아직 생성된 폴더가 없습니다. mock 데이터를 활성화하거나 새 패턴을 추가해보세요."}
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {nodes.map((node) => (
        <FolderBranch key={node.folder.id} node={node} expandedFolders={expandedFolders} onToggle={onToggle} />
      ))}
    </ul>
  )
}
