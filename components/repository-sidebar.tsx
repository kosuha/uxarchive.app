"use client"

import * as React from "react"
import { useRepositoryData } from "@/components/repository-data-context"
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar"
import { Archive, Plus, ChevronRight, Folder as FolderIcon, File as FileIcon } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { CreateRepositoryDialog } from "./create-repository-dialog"
import { ItemContextMenu } from "./item-context-menu"
import { SnapshotsDialog } from "./snapshots-dialog"
import { deleteRepositoryAction, forkRepositoryAction } from "@/app/actions/repositories"
import { listAssetsAction } from "@/app/actions/assets"
import { useQuery } from "@tanstack/react-query"
import { useToast } from "@/components/ui/use-toast"
import { duplicateAssetAction } from "@/app/actions/copy-paste"
import { copyRepositoryFolderAction, deleteRepositoryFolderAction } from "@/app/actions/repository-folders"

export function RepositorySidebar({ className }: { className?: string }) {
    const { repositories, selectedRepositoryId, setSelectedRepositoryId, folders, refresh, setCurrentFolderId } = useRepositoryData()
    const { toast } = useToast()
    const [snapshotRepoId, setSnapshotRepoId] = React.useState<string | null>(null) // State to control which repo's snapshots to show

    // Actually, I should update context to expose workspaceId.
    // Let's skip delete implementation in this 'replace' call and update context first if needed.
    // Or I can use a simpler approach: get workspaceId from `repositories[0].workspaceId` (if any exist).
    // Safe enough for now.
    const workspaceId = repositories[0]?.workspaceId;

    const handleDeleteRepository = async (id: string) => {
        if (!workspaceId) return;
        if (confirm("Are you sure you want to delete this repository?")) {
            await deleteRepositoryAction({ id, workspaceId });
            await refresh();
        }
    }

    const handleForkRepository = async (repo: any) => {
        if (!workspaceId) return;
        const newName = prompt("Enter name for forked repository:", `${repo.name} (Fork)`)
        if (!newName) return

        const result = await forkRepositoryAction({
            sourceRepositoryId: repo.id,
            workspaceId,
            name: newName,
            description: repo.description
        })

        if (result.error) {
            alert(`Failed to fork repository: ${result.error}`)
            return
        }
        await refresh()
    }

    return (
        <Sidebar className={className}>
            <SidebarHeader>
                <div className="flex items-center justify-between px-2 py-2">
                    <span className="font-semibold text-sm">Repositories</span>
                    {/* Add Create Repository Button here if needed */}
                    <CreateRepositoryDialog trigger={
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Plus className="h-4 w-4" />
                        </Button>
                    }>
                    </CreateRepositoryDialog>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {repositories.map((repo) => (
                                <Collapsible
                                    key={repo.id}
                                    defaultOpen={repo.id === selectedRepositoryId}
                                    className="group/collapsible"
                                >
                                    <SidebarMenuItem>
                                        <CollapsibleTrigger asChild>
                                            <ItemContextMenu
                                                type="repository"
                                                onDelete={() => handleDeleteRepository(repo.id)}
                                                onRename={() => alert("Rename not implemented yet")}
                                                onFork={() => handleForkRepository(repo)}
                                                onSnapshots={() => setSnapshotRepoId(repo.id)}
                                            >
                                                <SidebarMenuButton
                                                    isActive={repo.id === selectedRepositoryId}
                                                    onClick={() => {
                                                        setSelectedRepositoryId(repo.id)
                                                        setCurrentFolderId(null)
                                                    }}
                                                >
                                                    <Archive className="mr-2 h-4 w-4" />
                                                    <span>{repo.name}</span>
                                                    <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                                </SidebarMenuButton>
                                            </ItemContextMenu>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            <SidebarMenuSub>
                                                {repo.id === selectedRepositoryId
                                                    ? <FolderTree repositoryId={repo.id} folders={folders} />
                                                    : null
                                                }
                                            </SidebarMenuSub>
                                        </CollapsibleContent>
                                    </SidebarMenuItem>
                                </Collapsible>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarRail />

            {snapshotRepoId && (
                <SnapshotsDialog
                    repositoryId={snapshotRepoId}
                    open={!!snapshotRepoId}
                    onOpenChange={(open) => {
                        if (!open) setSnapshotRepoId(null)
                    }}
                />
            )}
        </Sidebar>
    )
}

// Recursive Folder Tree Component
function FolderTree({ repositoryId, folders }: { repositoryId: string, folders: any[] }) {
    const rootFolders = folders.filter(f => !f.parentId).sort((a, b) => a.order - b.order)

    return (
        <div className="flex flex-col gap-1 py-1">
            <RootAssets repositoryId={repositoryId} />
            {rootFolders.map(folder => (
                <SidebarFolderItem
                    key={folder.id}
                    folder={folder}
                    repositoryId={repositoryId}
                    allFolders={folders}
                />
            ))}
        </div>
    )
}

function RootAssets({ repositoryId }: { repositoryId: string }) {
    const { setClipboard } = useRepositoryData()
    const { toast } = useToast()
    const { data: assets = [] } = useQuery({
        queryKey: ["assets", repositoryId, "root"],
        queryFn: async () => listAssetsAction({ repositoryId, folderId: null }),
        enabled: !!repositoryId
    })

    if (assets.length === 0) return null

    return (
        <>
            {assets.map(asset => (
                <ItemContextMenu
                    key={asset.id}
                    type="asset"
                    onCopy={() => {
                        setClipboard({ type: 'asset', id: asset.id, repositoryId })
                        toast({ description: "Copied asset to clipboard" })
                    }}
                >
                    <SidebarMenuButton className="pl-6 h-8 text-muted-foreground">
                        <FileIcon className="mr-2 h-3.5 w-3.5" />
                        <span className="truncate">{(asset.meta as any)?.name || "Untitled"}</span>
                    </SidebarMenuButton>
                </ItemContextMenu>
            ))}
        </>
    )
}

function SidebarFolderItem({
    folder,
    repositoryId,
    allFolders
}: {
    folder: any,
    repositoryId: string,
    allFolders: any[]
}) {
    const [isOpen, setIsOpen] = React.useState(false)
    const { setClipboard, refresh, clipboard } = useRepositoryData()
    const { toast } = useToast()
    
    const children = allFolders.filter(f => f.parentId === folder.id).sort((a, b) => a.order - b.order)

    // Load assets when folder is open
    const { data: assets = [] } = useQuery({
        queryKey: ["assets", repositoryId, folder.id],
        queryFn: async () => listAssetsAction({ repositoryId, folderId: folder.id }),
        enabled: isOpen && !!repositoryId
    })

    const hasChildren = children.length > 0 || assets.length > 0

    const triggerContent = (
         <ItemContextMenu
            type="folder"
            onCopy={() => {
                setClipboard({ type: 'folder', id: folder.id, repositoryId })
                toast({ description: "Copied folder to clipboard" })
            }}
            onDelete={async () => {
                if (confirm(`Are you sure you want to delete folder ${folder.name}?`)) {
                    await deleteRepositoryFolderAction({ id: folder.id, repositoryId })
                    toast({ description: "Folder deleted" })
                    refresh()
                }
            }}
            onPaste={clipboard ? async () => {
                try {
                    if (clipboard.type === 'asset') {
                        // Toast promise removed for simplicity, or we can use a library that supports it or custom logic
                        // shadcn toast doesn't support promise chaining out of the box like sonner
                        // We will simplify to loading/success/error manually if needed, or just await
                        toast({ description: "Pasting asset..." })
                        await duplicateAssetAction({
                            assetId: clipboard.id,
                            targetRepositoryId: repositoryId,
                            targetFolderId: folder.id
                        })
                        toast({ description: "Asset pasted" })

                    } else if (clipboard.type === 'folder') {
                        toast({ description: "Pasting folder..." })
                        await copyRepositoryFolderAction({
                            sourceFolderId: clipboard.id,
                            sourceRepositoryId: clipboard.repositoryId,
                            targetRepositoryId: repositoryId,
                            targetParentId: folder.id
                        })
                        toast({ description: "Folder pasted" })
                    }
                    await refresh()
                } catch (e) {
                    console.error("Paste failed", e)
                    toast({ description: "Failed to paste", variant: "destructive" })
                }
            } : undefined}
        >
            <SidebarMenuButton className="pl-6 h-8">
                <FolderIcon className="mr-2 h-3.5 w-3.5 text-blue-500/80 fill-blue-500/10" />
                <span>{folder.name}</span>
                <ChevronRight className="ml-auto h-3 w-3 transition-transform group-data-[state=open]/folder:rotate-90" />
            </SidebarMenuButton>
        </ItemContextMenu>
    )

    if (!hasChildren) {
        return (
            <Collapsible open={isOpen} onOpenChange={setIsOpen} className="group/folder">
                <CollapsibleTrigger asChild>
                    {triggerContent}
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="border-l border-border/50 ml-6 pl-2 py-1 space-y-1">
                        <span className="text-xs text-muted-foreground pl-2 py-1 block">Empty</span>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        )
    }

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="group/folder">
            <CollapsibleTrigger asChild>
                {triggerContent}
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="border-l border-border/50 ml-6 pl-2 py-1 flex flex-col gap-1">
                    {children.map(child => (
                        <SidebarFolderItem
                            key={child.id}
                            folder={child}
                            repositoryId={repositoryId}
                            allFolders={allFolders}
                        />
                    ))}
                    {assets.map(asset => (
                        <ItemContextMenu
                            key={asset.id}
                            type="asset"
                            onCopy={() => {
                                setClipboard({ type: 'asset', id: asset.id, repositoryId })
                                toast({ description: "Copied asset to clipboard" })
                            }}
                        >
                            <SidebarMenuButton className="pl-6 h-8 text-muted-foreground">
                                <FileIcon className="mr-2 h-3.5 w-3.5" />
                                <span className="truncate">{(asset.meta as any)?.name || "Untitled"}</span>
                            </SidebarMenuButton>
                        </ItemContextMenu>
                    ))}
                    {assets.length === 0 && children.length === 0 && (
                        <span className="text-xs text-muted-foreground pl-2">Empty</span>
                    )}
                </div>
            </CollapsibleContent>
        </Collapsible>
    )
}

function SidebarMenuSub({ children }: { children: React.ReactNode }) {
    return <div className="flex flex-col gap-1 px-2 py-1">{children}</div>
}
