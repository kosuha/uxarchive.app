import { redirect } from "next/navigation"

interface SharePatternRedirectProps {
  params: Promise<{ patternId: string }>
}

export default async function SharePatternRedirectPage({ params }: SharePatternRedirectProps) {
  const { patternId } = await params
  redirect(`/patterns/${patternId}`)
}
