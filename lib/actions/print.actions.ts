'use server'

import { createClient } from '../supabase/server'
import type { ReceiptOrder } from '../printing/escpos-formatter'

export async function createPrintJob(
  order: ReceiptOrder,
  paymentMethod: string,
  taxRate: number,
  serviceChargeRate: number = 0,
  paperWidth: 58 | 80 = 80
) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('print_jobs')
    .insert({
      order_data: order as any,
      payment_method: paymentMethod,
      tax_rate: taxRate,
      service_charge_rate: serviceChargeRate,
      paper_width: paperWidth,
      status: 'pending'
    })
    .select('id')
    .single()

  if (error) {
    console.error('createPrintJob error:', error)
    return { error: 'Failed to create print job' }
  }

  return { data }
}

export async function updatePrintJobStatus(
  jobId: string,
  status: 'processing' | 'completed' | 'failed',
  errorMessage?: string
) {
  const supabase = await createClient()
  
  const updateData: any = { status }
  if (errorMessage) {
    updateData.error_message = errorMessage
  }

  const { error } = await supabase
    .from('print_jobs')
    .update(updateData)
    .eq('id', jobId)

  if (error) {
    console.error('updatePrintJobStatus error:', error)
    return { error: 'Failed to update print job status' }
  }

  return { success: true }
}
