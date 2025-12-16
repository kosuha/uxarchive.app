
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
export const revalidate = 60

export default async function SharedRepositoryPage({ params }: PageProps) {
    const { repositoryId } = await params
    const supabase = getServiceRoleSupabaseClient()

    try {
        const repository = await getPublicRepositoryById(supabase as any, repositoryId)
        if (!repository) notFound()

        const [folders, assets] = await Promise.all([
            listRepositoryFolders(supabase as any, { repositoryId }),
            listAssets(supabase as any, { repositoryId })
        ])

        return (
            <PublicRepositoryViewer 
                repository={repository}
                folders={folders}
                assets={assets}
            />
        )

    } catch (e) {
        notFound()
    }
}
