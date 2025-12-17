import { RepositoryError, SupabaseRepositoryClient } from "./types";
import { Database } from "@/lib/database.types";
import { listRepositoryFolders } from "./repository-folders";
import { listAssets } from "./assets";

type SnapshotInsert =
    Database["public"]["Tables"]["repository_snapshots"]["Insert"];
type SnapshotItemInsert =
    Database["public"]["Tables"]["snapshot_items"]["Insert"];

export type SnapshotRecord = {
    id: string;
    repositoryId: string;
    versionName: string;
    description: string | null;
    createdAt: string;
};

export type SnapshotItemRecord = {
    id: string;
    itemType: "folder" | "asset";
    itemData: any;
    parentId: string | null;
    children?: SnapshotItemRecord[]; // For tree structure
};

export async function createSnapshot(
    client: SupabaseRepositoryClient,
    input: {
        repositoryId: string;
        versionName: string;
        description?: string | null;
    },
): Promise<SnapshotRecord> {
    // 1. Create Snapshot Record
    const { data: snapshot, error: snapshotError } = await client
        .from("repository_snapshots")
        .insert({
            repository_id: input.repositoryId,
            version_name: input.versionName,
            description: input.description,
        })
        .select()
        .single();

    if (snapshotError) {
        throw new RepositoryError("Failed to create snapshot", snapshotError);
    }

    // 2. Fetch all current content
    const allFolders = await listRepositoryFolders(client, {
        repositoryId: input.repositoryId,
    });

    // Mapped by parent ID (or 'root')
    const foldersByParent = new Map<string, typeof allFolders>();
    for (const f of allFolders) {
        const pid = f.parentId ?? "root";
        const list = foldersByParent.get(pid) ?? [];
        list.push(f);
        foldersByParent.set(pid, list);
    }

    // Helper to insert a folder and its children/assets
    const insertFolderNode = async (
        folder: (typeof allFolders)[0] | null,
        parentSnapshotItemId: string | null,
    ) => {
        let currentSnapshotItemId = parentSnapshotItemId;

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
                        order: folder.order,
                        description: folder.description, // Capture description too
                    },
                })
                .select()
                .single();

            if (error) {
                throw new RepositoryError(
                    "Failed to insert folder snapshot item",
                    error,
                );
            }
            currentSnapshotItemId = item.id;
        }

        // Insert Assets for this folder (if it's a folder)
        if (folder) {
            const assets = await listAssets(client, { folderId: folder.id });
            if (assets.length > 0) {
                const assetInserts: SnapshotItemInsert[] = assets.map((a) => ({
                    snapshot_id: snapshot.id,
                    item_type: "asset",
                    original_item_id: a.id,
                    parent_snapshot_item_id: currentSnapshotItemId,
                    item_data: {
                        storage_path: a.storagePath,
                        width: a.width,
                        height: a.height,
                        meta: a.meta,
                        order: a.order,
                    },
                }));
                const { error } = await client.from("snapshot_items").insert(
                    assetInserts,
                );
                if (error) {
                    throw new RepositoryError(
                        "Failed to insert asset snapshot items",
                        error,
                    );
                }
            }
        }

        // Recurse for children folders
        if (folder) {
            const children = foldersByParent.get(folder.id) ?? [];
            for (const child of children) {
                await insertFolderNode(child, currentSnapshotItemId);
            }
        } else {
            // Root call
            const roots = foldersByParent.get("root") ?? [];
            for (const root of roots) {
                await insertFolderNode(root, null);
            }
        }
    };

    await insertFolderNode(null, null);

    return {
        id: snapshot.id,
        repositoryId: snapshot.repository_id,
        versionName: snapshot.version_name,
        description: snapshot.description,
        createdAt: snapshot.created_at,
    };
}

export async function listSnapshots(
    client: SupabaseRepositoryClient,
    repositoryId: string,
): Promise<SnapshotRecord[]> {
    const { data, error } = await client
        .from("repository_snapshots")
        .select("*")
        .eq("repository_id", repositoryId)
        .order("created_at", { ascending: false });

    if (error) throw new RepositoryError("Failed to list snapshots", error);

    return data.map((row) => ({
        id: row.id,
        repositoryId: row.repository_id,
        versionName: row.version_name,
        description: row.description,
        createdAt: row.created_at,
    }));
}

export async function deleteSnapshot(
    client: SupabaseRepositoryClient,
    snapshotId: string,
): Promise<void> {
    const { error } = await client
        .from("repository_snapshots")
        .delete()
        .eq("id", snapshotId);

    if (error) throw new RepositoryError("Failed to delete snapshot", error);
}

export async function getSnapshotTree(
    client: SupabaseRepositoryClient,
    snapshotId: string,
): Promise<SnapshotItemRecord[]> {
    const { data: items, error } = await client
        .from("snapshot_items")
        .select("*")
        .eq("snapshot_id", snapshotId);

    if (error) throw new RepositoryError("Failed to get snapshot items", error);

    // Build tree
    const itemMap = new Map<string, SnapshotItemRecord>();
    const roots: SnapshotItemRecord[] = [];

    // 1. Create nodes
    for (const item of items) {
        itemMap.set(item.id, {
            id: item.id,
            itemType: item.item_type as "folder" | "asset",
            itemData: item.item_data,
            parentId: item.parent_snapshot_item_id,
            children: [],
        });
    }

    // 2. Link
    for (const item of items) {
        const node = itemMap.get(item.id)!;
        if (item.parent_snapshot_item_id) {
            const parent = itemMap.get(item.parent_snapshot_item_id);
            if (parent) {
                parent.children = parent.children || [];
                parent.children.push(node);
                // Sort by order within parent
                parent.children.sort((a, b) =>
                    (a.itemData.order || 0) - (b.itemData.order || 0)
                );
            }
        } else {
            // Only folders can be roots in our system (assets are usually inside folders, but if we support root assets later...)
            // Actually, if we support root assets, they also go here.
            roots.push(node);
        }
    }

    // Sort roots
    roots.sort((a, b) => (a.itemData.order || 0) - (b.itemData.order || 0));

    return roots;
}

export async function restoreSnapshot(
    client: SupabaseRepositoryClient,
    repositoryId: string,
    snapshotId: string,
): Promise<void> {
    // 1. Fetch Snapshot Structure First to ensure it exists
    const tree = await getSnapshotTree(client, snapshotId);

    // 2. Delete Current Content
    // Deleting root folders cascades to children folders and assets
    // We also need to delete any assets that might be at the root if we allowed that (currently schema forces assets in folders?
    // Schema: assets.folder_id NOT NULL. So assets MUST be in folders.)
    // But repository_folders.parent_id allows NULL (root folders).

    // So deleting all folders for this repository is sufficient.
    const { error: deleteError } = await client
        .from("repository_folders")
        .delete()
        .eq("repository_id", repositoryId);

    if (deleteError) {
        throw new RepositoryError("Failed to clear current state", deleteError);
    }

    // 3. Reconstruct
    // Recursive insert helper
    const insertNode = async (
        node: SnapshotItemRecord,
        parentFolderId: string | null,
    ) => {
        if (node.itemType === "folder") {
            const { data: newFolder, error } = await client
                .from("repository_folders")
                .insert({
                    repository_id: repositoryId,
                    parent_id: parentFolderId,
                    name: node.itemData.name,
                    order: node.itemData.order,
                    description: node.itemData.description,
                })
                .select()
                .single();

            if (error) {
                throw new RepositoryError("Failed to restore folder", error);
            }

            if (node.children) {
                for (const child of node.children) {
                    await insertNode(child, newFolder.id);
                }
            }
        } else if (node.itemType === "asset") {
            // Assets must have a parent folder in our current schema
            if (!parentFolderId) {
                console.warn(
                    "Skipping root asset (not supported in current schema):",
                    node.itemData,
                );
                return;
            }

            const { error } = await client
                .from("assets")
                .insert({
                    folder_id: parentFolderId,
                    storage_path: node.itemData.storage_path,
                    width: node.itemData.width,
                    height: node.itemData.height,
                    meta: node.itemData.meta,
                    order: node.itemData.order,
                });

            if (error) {
                throw new RepositoryError("Failed to restore asset", error);
            }
        }
    };

    for (const root of tree) {
        await insertNode(root, null);
    }
}
