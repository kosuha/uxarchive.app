import { RepositoryError } from "@/lib/repositories/types"

export const ensureMaxLength = (value: string | null | undefined, max: number, fieldLabel: string) => {
  if (typeof value === "string" && value.length > max) {
    throw new RepositoryError(`${fieldLabel} must be ${max} characters or fewer.`)
  }
}
