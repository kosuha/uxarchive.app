import { SupabaseRepositoryClient } from "./types"
import { listRepositoryFolders, createRepositoryFolder } from "./repository-folders"
import { listAssets, createAsset } from "./assets"

/**
 * Copies a folder structure (files and subfolders) from one location to another.
 * Can be used for:
 * 1. Copying a single folder within/across repos.
 * 2. Copying an entire repository (by passing list of root folders).
 */
export async function copyFoldersRecursively(
    client: SupabaseRepositoryClient,
    input: {
        sourceRepositoryId: string
        targetRepositoryId: string
        targetParentId: string | null
        sourceFolderIds: string[] // List of folder IDs to start copying from
    }
) {
    // Optimization: Fetch all source folders once to build the tree
    // Note: If sourceRepository is huge, this might be heavy. But for MVP it's optimal vs N+1 queries.
    const allSourceFolders = await listRepositoryFolders(client, { repositoryId: input.sourceRepositoryId })
    const folderMap = new Map<string, typeof allSourceFolders>() // parentId -> folders

    for (const folder of allSourceFolders) {
        const pid = folder.parentId ?? "root"
        const existing = folderMap.get(pid) ?? []
        existing.push(folder)
        folderMap.set(pid, existing)
    }

    // Helper to copy a single folder node and its children
    const copyNode = async (sourceId: string, currentTargetParentId: string | null) => {
        const sourceFolder = allSourceFolders.find(f => f.id === sourceId)
        if (!sourceFolder) return

        // 1. Create target folder
        const newFolder = await createRepositoryFolder(client, {
            repositoryId: input.targetRepositoryId,
            name: sourceFolder.name + (input.sourceRepositoryId === input.targetRepositoryId && !currentTargetParentId ? " (Copy)" : ""),
            parentId: currentTargetParentId,
            order: sourceFolder.order
        })

        // 2. Copy Assets (Still per-folder fetch, can be optimized later if needed)
        const assets = await listAssets(client, { folderId: sourceId })
        for (const asset of assets) {
            await createAsset(client, {
                repositoryId: input.targetRepositoryId,
                folderId: newFolder.id,
                storagePath: asset.storagePath,
                width: asset.width,
                height: asset.height,
                meta: asset.meta,
                order: asset.order
            })
        }

        // 3. Recurse for children
        const children = folderMap.get(sourceId) ?? []
        for (const child of children) {
            await copyNode(child.id, newFolder.id)
        }
    }

    // Run parallel or detailed? Parallel might hit rate limits. Sequential for safety.
    for (const rootId of input.sourceFolderIds) {
        await copyNode(rootId, input.targetParentId)
    }
}
