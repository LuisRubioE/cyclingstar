export interface FormPoint {
  gameDay: number
  ctl: number
  atl: number
  tsb: number
  tss: number
  activity: string
}

export interface FormResponse {
  log: FormPoint[]
  form: { stars: number; freshness: number } | null
}

export async function fetchForm(): Promise<FormResponse> {
  const res = await fetch('/api/riders/me/form')
  if (!res.ok) throw new Error('Could not load your form.')
  return (await res.json()) as FormResponse
}
