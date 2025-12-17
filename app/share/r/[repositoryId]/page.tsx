
import { Metadata, ResolvingMetadata } from "next"
import { getServiceRoleSupabaseClient } from "@/lib/supabase/service-client"
import { getPublicRepositoryById } from "@/lib/repositories/repositories"
import { listRepositoryFolders } from "@/lib/repositories/repository-folders"
import { listAssets } from "@/lib/repositories/assets"
import { PublicRepositoryViewer } from "@/components/public-view/public-repository-viewer"
import { notFound } from "next/navigation"

interface PageProps {
    params: Promise<{ repositoryId: string }>
}

export async function generateMetadata(
    { params }: PageProps,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const { repositoryId } = await params
    const supabase = getServiceRoleSupabaseClient()
    
    try {
        const repo = await getPublicRepositoryById(supabase as any, repositoryId)
        return {
            title: `${repo.name} · UX Archive`,
            description: repo.description || `View ${repo.name} on UX Archive`,
            openGraph: {
                title: repo.name,
                description: repo.description || undefined,
                type: 'website',
            }
        }
    } catch (e) {
        return {
            title: 'Repository Not Found',
        }
    }
}

// Revalidate frequently or use 0 for fresh data? 
// Pattern page uses cache().
export const revalidate = 0 // Dynamic for searchParams

import { listSnapshots, getSnapshotAsRepositoryData } from "@/lib/repositories/snapshots"

export default async function SharedRepositoryPage({
    params,
    searchParams,
}: {
    params: Promise<{ repositoryId: string }>
    searchParams: Promise<{ versionId?: string }>
}) {
    const { repositoryId } = await params
    const { versionId } = await searchParams
    const supabase = getServiceRoleSupabaseClient()

    try {
        // 1. Fetch live repository details (metadata mostly)
        // We need this even for versions to check existence/visibility
        const repository = await getPublicRepositoryById(supabase as any, repositoryId)
        if (!repository) notFound()

        // 2. Fetch available versions (snapshots)
        // Note: listSnapshots currently fetches ALL snapshots. 
        // We might want to filter or limit, but for now it's fine.
        const snapshots = await listSnapshots(supabase as any, repositoryId)
        const versions = snapshots.map(s => ({
            id: s.id,
            name: s.versionName,
            createdAt: s.createdAt
        }))

        // 3. Determine Data Source (Live vs Version)
        let folders, assets, viewRepository;

        if (versionId) {
            // Fetch Version Data
            const snapshotData = await getSnapshotAsRepositoryData(supabase as any, repositoryId, versionId)
            
            if (snapshotData) {
                viewRepository = snapshotData.repository
                folders = snapshotData.folders
                assets = snapshotData.assets
            } else {
                // Version not found or error, fallback to live? or 404?
                // Let's fallback to live but maybe show a toast or something? 
                // Currently just falling back effectively or 404ing the content if we default to null.
                // Let's redirect to live if version missing? No, server component.
                // Let's just 404 for now if version ID is bad.
                notFound()
            }
        } else {
            // Live Data
            viewRepository = repository
            const [f, a] = await Promise.all([
                listRepositoryFolders(supabase as any, { repositoryId }),
                listAssets(supabase as any, { repositoryId, mode: "recursive" })
            ])
            folders = f
            assets = a
        }

        return (
            <PublicRepositoryViewer 
                repository={viewRepository}
                folders={folders}
                assets={assets}
                versions={versions}
                currentVersionId={versionId}
            />
        )

    } catch (e) {
        notFound()
    }
}
