'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Company } from '@/lib/types'

export async function getCompanies(): Promise<Company[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('name')

  if (error) throw new Error(error.message)
  return data ?? []
}

export interface CreateCompanyData {
  name: string
  street_address: string
  city: string
  province: string
  country: string
  postal_code: string
}

export async function createCompany(
  data: CreateCompanyData
): Promise<{ company: Company | null; error: string | null }> {
  const supabase = await createClient()

  const name = data.name.trim()
  if (!name) return { company: null, error: 'Company name is required.' }
  if (!data.city.trim()) return { company: null, error: 'City is required.' }
  if (!data.province.trim()) return { company: null, error: 'Province/state is required.' }
  if (!data.country.trim()) return { company: null, error: 'Country is required.' }

  const { data: company, error } = await supabase
    .from('companies')
    .insert({
      name,
      street_address: data.street_address.trim(),
      city: data.city.trim(),
      province: data.province.trim(),
      country: data.country.trim(),
      postal_code: data.postal_code.trim(),
    })
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { company: null, error: 'A company with this name already exists.' }
    }
    return { company: null, error: error.message }
  }

  revalidatePath('/dashboard/jobs')
  return { company, error: null }
}
