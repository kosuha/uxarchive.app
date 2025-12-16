import { notFound } from "next/navigation"

import { getProfileByUsername } from "@/lib/api/profile"
import { fetchShareList } from "@/lib/api/share"
import { PatternsHeader } from "@/components/share/patterns-header"
import { ProfileHeader } from "@/components/profile/profile-header"
import { ShareListing } from "@/components/share/share-listing"

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

    // Fetch initial posts for this user
    const { items } = await fetchShareList(
        {
            userId: profile.id,
            sort: "recent",
            perPage: 24,
            includeCaptures: true,
        },
        { next: { revalidate: 60 } }
    )

    const initialPosts = items.filter((item) => item.isPublic)

    return (
        <div className="min-h-screen bg-background text-foreground">
            <PatternsHeader hideSearch={true} />
            <div className="mx-auto w-full max-w-[1600px] px-4 pt-8 sm:px-6 lg:px-8">
                <ProfileHeader profile={profile} />

                <div className="mt-8 border-t border-white/10 pt-8">
                    <h2 className="mb-6 text-xl font-semibold">Published Patterns</h2>
                    <ShareListing
                        initialPosts={initialPosts}
                        userId={profile.id}
                    />
                </div>
            </div>
        </div>
    )
}
