'use server';

import { z } from 'zod'
import { Invoice } from './definitions';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const FormShcema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(['pending', 'paid']),
    date: z.string()
});

const CreateInvoiceFormSchema = FormShcema.omit({
    id: true,
    date: true
})

const UpdateInvoice = FormShcema.omit({
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

    try {
        await sql`
            INSERT INTO invoices (customer_id, amount, status, date)
            VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
        `
    } catch (error) {
        return {
            message: "Database Error: Failed to create Invoice"
        }
    }

    revalidatePath('/dashboard/invoices')
    redirect('/dashboard/invoices')
}

export async function updateInvoice(id: string, form: FormData) {
    const {customerId, amount, status} = UpdateInvoice.parse({
        customerId: form.get('customerId'),
        amount: form.get('amount'),
        status: form.get('status')
    })

    const amountInCents = amount * 100

    try {
        await sql`
            UPDATE invoices
            SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
            WHERE id = ${id}
        `    
    } catch (error) {
        return {
            message: "Database Error: Failed to update Invoice"
        }
    }
    revalidatePath('/dashboard/invoices')
    redirect('/dashboard/invoices')
}

export async function deleteInvoice(id: string) {
    try {
        await sql`DELETE FROM invoices WHERE id = ${id}`
        revalidatePath('/dashboard/invoices')
    } catch (error) {
        return {
            message: "Database Error: Failed to delete Invoice"
        }
    }
}