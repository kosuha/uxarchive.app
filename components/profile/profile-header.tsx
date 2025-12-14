import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Profile } from "@/lib/api/profile"

interface ProfileHeaderProps {
    profile: Profile
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
    const joinDate = new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    })

    return (
        <div className="flex flex-col items-center gap-6 py-12 text-center sm:py-16">
            <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                <AvatarImage src={profile.avatar_url ?? ""} alt={profile.display_name} />
                <AvatarFallback className="text-4xl">
                    {profile.display_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
            </Avatar>

            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                    @{profile.username}
                </h1>

                {profile.bio && (
                    <p className="mx-auto max-w-lg text-muted-foreground leading-relaxed">
                        {profile.bio}
                    </p>
                )}

                <p className="text-sm text-muted-foreground/60 pt-2">
                    Joined {joinDate}
                </p>
            </div>
        </div>
    )
}
