import { SupabaseRepositoryClient, RepositoryError } from "./types"
import { Database } from "@/lib/database.types"
import { listRepositoryFolders } from "./repository-folders"
import { listAssets } from "./assets"

type SnapshotInsert = Database["public"]["Tables"]["repository_snapshots"]["Insert"]
type SnapshotItemInsert = Database["public"]["Tables"]["snapshot_items"]["Insert"]

export type SnapshotRecord = {
    id: string
    repositoryId: string
    versionName: string
    description: string | null
    createdAt: string
}

export async function createSnapshot(
    client: SupabaseRepositoryClient,
    input: {
        repositoryId: string
        versionName: string
        description?: string | null
    }
): Promise<SnapshotRecord> {
    // 1. Create Snapshot Record
    const { data: snapshot, error: snapshotError } = await client
        .from("repository_snapshots")
        .insert({
            repository_id: input.repositoryId,
            version_name: input.versionName,
            description: input.description
        })
        .select()
        .single()

    if (snapshotError) throw new RepositoryError("Failed to create snapshot", snapshotError)

    // 2. Fetch all current content
    const allFolders = await listRepositoryFolders(client, { repositoryId: input.repositoryId })
    // We need to fetch ALL assets in the repo. listAssets current implementation filters by folderId.
    // We need a way to list ALL assets for the repo.
    // Current `listAssets` takes `folderId`.
    // I should create a new helper or modify `listAssets` to support `repositoryId`? 
    // `assets` table has `folder_id`. `repository_folders` has `repository_id`.
    // We can join or just iterate folders.
    // Iterating folders is safer given current API, but less efficient.
    // Let's implement `listAllAssetsInRepository` helper here or in assets.ts? 
    // For now, let's just fetch assets for each folder. Optimize later if slow.
    
    // Map: Original ID -> Snapshot Item ID
    const idMap = new Map<string, string>()

    // 3. Insert Folders (Top-down)
    // We can't easily do single batch insert because we need parent IDs from the *new* snapshot items.
    // So we must insert root folders, then their children, etc.
    
    const foldersByParent = new Map<string, typeof allFolders>()
    for (const f of allFolders) {
        const pid = f.parentId ?? "root"
        const list = foldersByParent.get(pid) ?? []
        list.push(f)
        foldersByParent.set(pid, list)
    }

    // Helper to insert a folder and its children/assets
    const insertFolderNode = async (folder: (typeof allFolders)[0] | null, parentSnapshotItemId: string | null) => {
        let currentSnapshotItemId = parentSnapshotItemId

        if (folder) {
            // Create snapshot item for this folder
            const { data: item, error } = await client
                .from("snapshot_items")
                .insert({
                    snapshot_id: snapshot.id,
                    item_type: "folder",
                    original_item_id: folder.id,
                    parent_snapshot_item_id: parentSnapshotItemId,
                    item_data: {
                        name: folder.name,
                        order: folder.order
                    }
                })
                .select()
                .single()
            
            if (error) throw new RepositoryError("Failed to insert folder snapshot item", error)
            currentSnapshotItemId = item.id
            idMap.set(folder.id, item.id)
        }

        // Insert Assets for this folder (if it's a folder)
        if (folder) {
             const assets = await listAssets(client, { folderId: folder.id })
             if (assets.length > 0) {
                 const assetInserts: SnapshotItemInsert[] = assets.map(a => ({
                     snapshot_id: snapshot.id,
                     item_type: "asset",
                     original_item_id: a.id,
                     parent_snapshot_item_id: currentSnapshotItemId,
                     item_data: {
                         storage_path: a.storagePath,
                         width: a.width,
                         height: a.height,
                         meta: a.meta,
                         order: a.order
                     }
                 }))
                 const { error } = await client.from("snapshot_items").insert(assetInserts)
                 if (error) throw new RepositoryError("Failed to insert asset snapshot items", error)
             }
        }

        // Recurse for children folders
        if (folder) {
            const children = foldersByParent.get(folder.id) ?? []
            for (const child of children) {
                await insertFolderNode(child, currentSnapshotItemId)
            }
        } else {
            // Root call
            const roots = foldersByParent.get("root") ?? []
            for (const root of roots) {
                await insertFolderNode(root, null)
            }
        }
    }

    await insertFolderNode(null, null)

    return {
        id: snapshot.id,
        repositoryId: snapshot.repository_id,
        versionName: snapshot.version_name,
        description: snapshot.description,
        createdAt: snapshot.created_at
    }
}

export async function listSnapshots(
    client: SupabaseRepositoryClient,
    repositoryId: string
): Promise<SnapshotRecord[]> {
    const { data, error } = await client
        .from("repository_snapshots")
        .select("*")
        .eq("repository_id", repositoryId)
        .order("created_at", { ascending: false })

    if (error) throw new RepositoryError("Failed to list snapshots", error)

    return data.map(row => ({
        id: row.id,
        repositoryId: row.repository_id,
        versionName: row.version_name,
        description: row.description,
        createdAt: row.created_at
    }))
}
