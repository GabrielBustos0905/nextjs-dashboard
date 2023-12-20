'use server';

import { z } from 'zod'
import { Invoice } from './definitions';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const CreateInvoiceSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['pending', 'paid']),
    date: z.string()
});

const CreateInvoiceFormSchema = CreateInvoiceSchema.omit({
    id: true,
    date: true
})

export async function createInvoice(form: FormData) {
    const {customerId, amount, status} = CreateInvoiceFormSchema.parse({
        customerId: form.get('customerId'),
        amount: form.get('amount'),
        status: form.get('status')
    })

    // Transformamos para evitar errores de redondeo
    const amountInCents = amount * 100
    // creamos la fecha actual año/mes/dia
    const [date] = new Date().toISOString().split('T')

    await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `

    revalidatePath('/dashboard/invoices')
    redirect('/dashboard/invoices')
}