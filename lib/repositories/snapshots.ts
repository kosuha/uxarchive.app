import { RepositoryError, SupabaseRepositoryClient } from "./types";
import { Database } from "@/lib/database.types";
import { listRepositoryFolders } from "./repository-folders";
import { listAssets } from "./assets";

type SnapshotInsert =
    Database["public"]["Tables"]["repository_snapshots"]["Insert"];
type SnapshotItemInsert =
    Database["public"]["Tables"]["snapshot_items"]["Insert"];

// Update SnapshotRecord type if we want to expose it, but for now just saving it is enough for restoration.
// Or we can add it to the type. Let's add it.
export type SnapshotRecord = {
    id: string;
    repositoryId: string;
    versionName: string;
    description: string | null;
    repositoryDescription: string | null;
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
    // 0. Fetch Repository Details (to get current description)
    const { data: repo, error: repoError } = await client
        .from("repositories")
        .select("description")
        .eq("id", input.repositoryId)
        .single();

    if (repoError) {
        throw new RepositoryError(
            "Failed to fetch repository details",
            repoError,
        );
    }

    // 1. Create Snapshot Record
    const { data: snapshot, error: snapshotError } = await client
        .from("repository_snapshots")
        .insert({
            repository_id: input.repositoryId,
            version_name: input.versionName,
            description: input.description, // Version description
            repository_description: repo.description, // Captured Repo description
        })
        .select()
        .single();

    if (snapshotError) {
        throw new RepositoryError("Failed to create snapshot", snapshotError);
    }

    // ... (Rest of function remains same until return) ...

    // 2. Fetch all current content
    const allFolders = await listRepositoryFolders(client, {
        repositoryId: input.repositoryId,
    });
    console.log(
        `[createSnapshot] Found ${allFolders.length} folders for repo ${input.repositoryId}`,
    );

    // Mapped by parent ID (or 'root')
    const foldersByParent = new Map<string, typeof allFolders>();
    for (const f of allFolders) {
        const pid = f.parentId ?? "root";
        const list = foldersByParent.get(pid) ?? [];
        list.push(f);
        foldersByParent.set(pid, list);
    }
    console.log(
        `[createSnapshot] foldersByParent size: ${foldersByParent.size}`,
    );

    // Helper to insert a folder and its children/assets
    const insertFolderNode = async (
        folder: (typeof allFolders)[0] | null,
        parentSnapshotItemId: string | null,
    ) => {
        let currentSnapshotItemId = parentSnapshotItemId;

        if (folder) {
            console.log(
                `[createSnapshot] Inserting folder: ${folder.name} (${folder.id})`,
            );
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
                console.error(`[createSnapshot] Failed request:`, error);
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
            console.log(
                `[createSnapshot] Found ${assets.length} assets in folder ${folder.name}`,
            );
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
            console.log(`[createSnapshot] Root folders count: ${roots.length}`);
            for (const root of roots) {
                await insertFolderNode(root, null);
            }

            // Insert Root Assets (assets with no parent folder)
            // Note: `listAssets` logic for { folderId: null } handles `is("folder_id", null)`
            const rootAssets = await listAssets(client, {
                repositoryId: input.repositoryId,
                folderId: null,
            });
            console.log(
                `[createSnapshot] Found ${rootAssets.length} root assets`,
            );

            if (rootAssets.length > 0) {
                const assetInserts: SnapshotItemInsert[] = rootAssets.map((
                    a,
                ) => ({
                    snapshot_id: snapshot.id,
                    item_type: "asset",
                    original_item_id: a.id,
                    parent_snapshot_item_id: null, // Root level
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
                    console.error(
                        `[createSnapshot] Failed to insert root assets:`,
                        error,
                    );
                    throw new RepositoryError(
                        "Failed to insert root asset snapshot items",
                        error,
                    );
                }
            }
        }
    };

    await insertFolderNode(null, null);

    return {
        id: snapshot.id,
        repositoryId: snapshot.repository_id,
        versionName: snapshot.version_name,
        description: snapshot.description,
        repositoryDescription: snapshot.repository_description, // Return it
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
        repositoryDescription: row.repository_description,
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
    // 0. Fetch Snapshot Metadata to get saved Repository Description
    const { data: snapshot, error: snapshotError } = await client
        .from("repository_snapshots")
        .select("repository_description, version_name")
        .eq("id", snapshotId)
        .single();

    if (snapshotError) {
        throw new RepositoryError(
            "Failed to fetch snapshot metadata",
            snapshotError,
        );
    }

    // 0.1 Restore Repository Description (if saved)
    if (snapshot.repository_description !== undefined) {
        // Note: undefined check allows null restoration if it was null. explicit check prevents if column missing (though we migrated).
        const { error: updateRepoError } = await client
            .from("repositories")
            .update({
                description: snapshot.repository_description,
            })
            .eq("id", repositoryId);

        if (updateRepoError) {
            throw new RepositoryError(
                "Failed to restore repository description",
                updateRepoError,
            );
        }
    }

    // 1. Fetch Snapshot Structure First to ensure it exists
    const tree = await getSnapshotTree(client, snapshotId);

    // 2. Delete Current Content
    // Deleting root folders cascades to children folders and assets
    // We also need to delete any assets that might be at the root if we allowed that (currently schema forces assets in folders?
    // Schema: assets.folder_id NOT NULL. So assets MUST be in folders.)
    // But repository_folders.parent_id allows NULL (root folders).

    // Also need to clear root assets if we supported them (our createSnapshot does supported them).
    // The previous implementation of restore only cleared folders.
    // This leaves current root assets orphaned or failing if constraints.
    // If we have root assets, we must delete them too.

    // Delete all assets where folder_id is null AND repository match?
    // Assets table doesn't have repository_id directly! It relies on folder_id -> repository_id.
    // BUT wait, Schema:
    // assets table: folder_id NOT NULL.
    // So there ARE NO root assets in the actual standard schema?
    // Let's check schema lines 30-40. `folder_id UUID NOT NULL REFERENCES public.repository_folders(id)`.
    // So structurally, currently, assets MUST belongs to a folder.
    // However, `createSnapshot` has logic for root assets. This might be zombie logic or for a future where folder_id is nullable.
    // If folder_id IS NOT NULL, then deleting all folders deletes all assets. Safe.

    // But wait, `createSnapshot` Line 156 calls `listAssets` with `folderId: null`.
    // Does `listAssets` support querying assets with NO folder?
    // If table defines `folder_id` as NOT NULL, `listAssets({folderId: null})` returns empty.
    // So the "Root Assets" logic in createSnapshot is likely doing nothing currently, but harmless.

    // So Step 2: Delete all folders is sufficient.

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
