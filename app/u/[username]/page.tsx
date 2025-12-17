import { notFound } from "next/navigation"

import { getProfileByUsername } from "@/lib/api/profile"
import { listUserPublicRepositoriesAction } from "@/app/actions/repositories"
import { PatternsHeader } from "@/components/share/patterns-header"
import { ProfileHeader } from "@/components/profile/profile-header"
import { PublicRepositoryList } from "@/components/public-view/public-repository-list"

interface PageProps {
    params: Promise<{
        username: string
    }>
}

export default async function ProfilePage(props: PageProps) {
    const params = await props.params
    const username = params.username

    const profile = await getProfileByUsername(username)

    if (!profile) {
        notFound()
    }

    // Fetch initial public repositories for this user
    const { repositories } = await listUserPublicRepositoriesAction(username)

    return (
        <div className="min-h-screen bg-background text-foreground">
            <PatternsHeader hideSearch={true} />
            <div className="mx-auto w-full max-w-[1600px] px-4 pt-8 sm:px-6 lg:px-8">
                <ProfileHeader profile={profile} />

                <div className="mt-8 border-t border-white/10 pt-8">
                    <h2 className="mb-6 text-xl font-semibold">Public Repositories</h2>
                    <PublicRepositoryList repositories={repositories} />
                </div>
            </div>
        </div>
    )
}
