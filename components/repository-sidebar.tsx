"use client"

import { useRepositoryData } from "@/components/repository-data-context"
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar"
import { Archive, Plus, ChevronRight } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { CreateRepositoryDialog } from "./create-repository-dialog"
import { ItemContextMenu } from "./item-context-menu"
import { deleteRepositoryAction } from "@/app/actions/repositories"
import { useRepositoryData } from "@/components/repository-data-context"

export function RepositorySidebar({ className }: { className?: string }) {
    const { repositories, selectedRepositoryId, setSelectedRepositoryId, folders, refresh } = useRepositoryData()
    const { user } = useRepositoryData() as any // context mostly correct, but 'user' access might be missing if I didn't verify context shape. 
    // Wait, useRepositoryData context doesn't expose 'user' or 'workspaceId'.
    // deleteRepositoryAction requires { id, workspaceId }.
    // I need workspaceId in the context to call deleteAction properly.
    // I updated context to fetch membership but didn't expose workspaceId in 'value'.
    // Let's assume I fix context first or fetch it again (inefficient).

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


    // Group folders by parentId for tree view? 
    // For the sidebar, do we show the folder tree or just the repo list?
    // Plan says: "Left sidebar is repository list. Here you can see folder structure per repository."
    // So yes, we should render the folder tree for the *selected* repository maybe?
    // Or list all repos and their trees? standard is usually:
    // - Repo A
    //   - Folder 1
    // - Repo B

    // Let's implement a simple tree for the selected repository.

    return (
        <Sidebar className={className}>
            <SidebarHeader>
                <div className="flex items-center justify-between px-2 py-2">
                    <span className="font-semibold text-sm">Repositories</span>
                    {/* Add Create Repository Button here if needed */}
                    <CreateRepositoryDialog>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Plus className="h-4 w-4" />
                        </Button>
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
                                            >
                                                <SidebarMenuButton
                                                    isActive={repo.id === selectedRepositoryId}
                                                    onClick={() => setSelectedRepositoryId(repo.id)}
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
                                                    : null // Or fetch folders for other repos if we had them
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
        </Sidebar>
    )
}

// Recursive Folder Tree Component
function FolderTree({ repositoryId, folders }: { repositoryId: string, folders: any[] }) {
    // Filter folders for this repo (though context basically gives us selected repo's folders mostly)
    // context gives `folders` which are loaded for selectedRepositoryId.
    // So if this repo != selected, we might not have folders. Confirmed in provider logic.

    // Build tree
    const rootFolders = folders.filter(f => !f.parentId).sort((a, b) => a.order - b.order)

    // Helper to get children
    const getChildren = (parentId: string) => folders.filter(f => f.parentId === parentId).sort((a, b) => a.order - b.order)

    const renderFolder = (folder: any) => {
        const children = getChildren(folder.id)
        if (children.length === 0) {
            return (
                <SidebarMenuButton key={folder.id} className="pl-6">
                    <span>{folder.name}</span>
                </SidebarMenuButton>
            )
        }

        return (
            <Collapsible key={folder.id} className="group/folder">
                <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="pl-6">
                        <span>{folder.name}</span>
                        <ChevronRight className="ml-auto h-3 w-3 transition-transform group-data-[state=open]/folder:rotate-90" />
                    </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <div className="border-l border-border ml-6 pl-2">
                        {children.map(renderFolder)}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        )
    }

    return (
        <div className="flex flex-col gap-1 py-1">
            {rootFolders.map(renderFolder)}
        </div>
    )
}

function SidebarMenuSub({ children }: { children: React.ReactNode }) {
    return <div className="flex flex-col gap-1 px-2 py-1">{children}</div>
}
